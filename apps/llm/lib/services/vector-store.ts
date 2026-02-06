import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";

import type { VectorPoint, SearchResult } from "../types";

// ============================================================
// 상수
// ============================================================

const DENSE_VECTOR_NAME = "dense_vector";
const SPARSE_VECTOR_NAME = "bm25_sparse_vector";
const DENSE_VECTOR_SIZE = 3072;
const SOURCES_COLLECTION_SUFFIX = "_sources";

// ============================================================
// 환경 변수 헬퍼
// ============================================================

/** Qdrant 서버 URL을 환경 변수에서 가져온다 */
function getQdrantUrl(): string {
  return process.env.QDRANT_URL || "http://localhost:6333";
}

/** Qdrant 컬렉션 이름을 환경 변수에서 가져온다 */
function getCollectionName(): string {
  return process.env.QDRANT_COLLECTION || "knowledge_chunks";
}

// ============================================================
// VectorStore 클래스
// ============================================================

/**
 * Qdrant 벡터 데이터베이스 클라이언트 래퍼.
 *
 * - Dense 벡터: Gemini 임베딩 (768차원, Cosine distance)
 * - Sparse 벡터: BM25 (Qdrant 내장 IDF modifier)
 * - URL 기반 삭제 (재인덱싱 시 기존 데이터 교체)
 * - 콘텐츠 해시 조회 (변경 감지)
 */
class VectorStore {
  private client: QdrantClient;
  private collectionName: string;

  constructor(client?: QdrantClient, collectionName?: string) {
    this.client = client ?? new QdrantClient({ url: getQdrantUrl() });
    this.collectionName = collectionName ?? getCollectionName();
  }

  /**
   * 컬렉션이 존재하지 않으면 자동으로 생성한다.
   * Dense 벡터(Cosine)와 Sparse 벡터(BM25 IDF)를 설정한다.
   */
  async ensureCollection(): Promise<void> {
    const exists = await this.client.collectionExists(
      this.collectionName
    );

    if (exists.exists) {
      return;
    }

    await this.client.createCollection(this.collectionName, {
      vectors: {
        [DENSE_VECTOR_NAME]: {
          size: DENSE_VECTOR_SIZE,
          distance: "Cosine",
        },
      },
      sparse_vectors: {
        [SPARSE_VECTOR_NAME]: {
          modifier: "idf",
        },
      },
    });

    // sourceUrl 필드에 키워드 인덱스를 생성하여 필터 검색 성능을 향상시킨다
    await this.client.createPayloadIndex(this.collectionName, {
      field_name: "sourceUrl",
      field_schema: "keyword",
      wait: true,
    });
  }

  /**
   * 벡터 포인트를 Qdrant에 삽입하거나 업데이트한다.
   *
   * @param points - 저장할 벡터 포인트 배열
   */
  async upsertPoints(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: points.map((point) => ({
        id: point.id,
        vector: {
          [DENSE_VECTOR_NAME]: point.vector.dense,
        },
        payload: {
          ...point.payload,
          indexedAt: now,
          sourceType: "url",
        },
      })),
    });
  }

  /**
   * 특정 URL에 해당하는 모든 벡터 포인트를 삭제한다.
   * 재인덱싱 시 기존 데이터를 교체하기 위해 사용한다.
   *
   * @param url - 삭제할 소스 URL
   */
  async deleteBySourceUrl(url: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: "sourceUrl",
            match: {
              value: url,
            },
          },
        ],
      },
    });
  }

  /**
   * Dense 벡터를 사용하여 유사도 검색을 수행한다.
   *
   * @param vector - 검색 쿼리 벡터 (768차원)
   * @param limit - 반환할 최대 결과 수
   * @returns 관련도 점수 기준 내림차순 정렬된 검색 결과
   */
  async searchDense(
    vector: number[],
    limit: number
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: {
        name: DENSE_VECTOR_NAME,
        vector,
      },
      limit,
      with_payload: true,
    });

    return results.map((result) => {
      const payload = result.payload as Record<string, unknown>;
      return {
        text: String(payload.text ?? ""),
        score: result.score,
        sourceUrl: String(payload.sourceUrl ?? ""),
        sourceTitle: String(payload.sourceTitle ?? ""),
        category: String(payload.category ?? ""),
        chunkIndex: Number(payload.chunkIndex ?? 0),
      };
    });
  }

  /**
   * 특정 URL의 콘텐츠 해시를 조회한다.
   * 인덱싱 시 콘텐츠 변경 여부를 확인하기 위해 사용한다.
   *
   * @param url - 조회할 소스 URL
   * @returns 콘텐츠 해시 문자열 또는 null (해당 URL이 없는 경우)
   */
  async getContentHashByUrl(url: string): Promise<string | null> {
    const result = await this.client.scroll(this.collectionName, {
      filter: {
        must: [
          {
            key: "sourceUrl",
            match: {
              value: url,
            },
          },
        ],
      },
      limit: 1,
      with_payload: ["contentHash"],
    });

    const points = result.points;
    if (points.length === 0) {
      return null;
    }

    const payload = points[0].payload as Record<string, unknown>;
    return payload.contentHash
      ? String(payload.contentHash)
      : null;
  }

  /**
   * Sparse 벡터(BM25)를 사용하여 키워드 검색을 수행한다.
   * Qdrant의 query API를 사용하여 sparse 벡터 검색을 수행한다.
   *
   * @param text - 검색할 텍스트 (sparse 벡터로 변환됨)
   * @param limit - 반환할 최대 결과 수
   * @returns 관련도 점수 기준 내림차순 정렬된 검색 결과
   */
  async searchSparse(
    text: string,
    limit: number
  ): Promise<SearchResult[]> {
    const results = await this.client.query(this.collectionName, {
      query: {
        text,
        model: "Qdrant/bm25",
      },
      using: SPARSE_VECTOR_NAME,
      limit,
      with_payload: true,
    });

    return (results.points ?? []).map((result) => {
      const payload = result.payload as Record<string, unknown>;
      return {
        text: String(payload.text ?? ""),
        score: result.score ?? 0,
        sourceUrl: String(payload.sourceUrl ?? ""),
        sourceTitle: String(payload.sourceTitle ?? ""),
        category: String(payload.category ?? ""),
        chunkIndex: Number(payload.chunkIndex ?? 0),
      };
    });
  }

  /** 테스트용: Qdrant 클라이언트 인스턴스를 반환한다 */
  getClient(): QdrantClient {
    return this.client;
  }

  /** 테스트용: 컬렉션 이름을 반환한다 */
  getCollectionName(): string {
    return this.collectionName;
  }

  // ============================================================
  // 소스 메타데이터 관리 (knowledge_sources 컬렉션)
  // ============================================================

  /** 소스 메타데이터 컬렉션 이름을 반환한다 */
  private getSourcesCollectionName(): string {
    return this.collectionName + SOURCES_COLLECTION_SUFFIX;
  }

  /**
   * 소스 메타데이터 컬렉션이 존재하지 않으면 생성한다.
   * 벡터 없이 payload만 저장하는 컬렉션이다.
   */
  async ensureSourcesCollection(): Promise<void> {
    const name = this.getSourcesCollectionName();
    const exists = await this.client.collectionExists(name);

    if (exists.exists) {
      return;
    }

    await this.client.createCollection(name, {
      vectors: {
        // Qdrant는 벡터가 필수이므로 더미 1차원 벡터를 사용한다
        dummy: { size: 1, distance: "Cosine" },
      },
    });

    await this.client.createPayloadIndex(name, {
      field_name: "url",
      field_schema: "keyword",
      wait: true,
    });
  }

  /**
   * 소스 메타데이터를 추가한다.
   */
  async addSource(source: {
    url: string;
    title: string;
    category: string;
    type: "url" | "text";
    content?: string;
  }): Promise<string> {
    const name = this.getSourcesCollectionName();
    const id = randomUUID();

    await this.client.upsert(name, {
      wait: true,
      points: [
        {
          id,
          vector: { dummy: [0] },
          payload: {
            url: source.url,
            title: source.title,
            category: source.category,
            type: source.type,
            content: source.content ?? null,
            createdAt: new Date().toISOString(),
          },
        },
      ],
    });

    return id;
  }

  /**
   * 등록된 모든 소스 메타데이터를 조회한다.
   */
  async getAllSources(): Promise<
    Array<{
      id: string;
      url: string;
      title: string;
      category: string;
      type: "url" | "text";
      content?: string;
      indexingStatus: "indexed" | "not_indexed";
    }>
  > {
    const name = this.getSourcesCollectionName();
    const allPoints: Array<{
      id: string | number;
      payload: Record<string, unknown>;
    }> = [];

    let offset: string | number | undefined;

    // scroll로 전체 포인트를 가져온다
    while (true) {
      const result = await this.client.scroll(name, {
        limit: 100,
        with_payload: true,
        offset,
      });

      allPoints.push(
        ...result.points.map((p) => ({
          id: p.id,
          payload: p.payload as Record<string, unknown>,
        }))
      );

      if (!result.next_page_offset) {
        break;
      }
      offset = result.next_page_offset as string | number | undefined;
    }

    // 각 소스의 인덱싱 상태를 확인한다
    const sources = await Promise.all(
      allPoints.map(async (point) => {
        const url = String(point.payload.url ?? "");
        let indexingStatus: "indexed" | "not_indexed" =
          "not_indexed";

        try {
          const hash = await this.getContentHashByUrl(url);
          if (hash) {
            indexingStatus = "indexed";
          }
        } catch {
          // 에러 시 not_indexed로 처리
        }

        return {
          id: String(point.id),
          url,
          title: String(point.payload.title ?? ""),
          category: String(point.payload.category ?? ""),
          type: (point.payload.type as "url" | "text") ?? "url",
          content: point.payload.content
            ? String(point.payload.content)
            : undefined,
          indexingStatus,
        };
      })
    );

    return sources;
  }

  /**
   * URL로 소스 메타데이터를 조회한다.
   */
  async getSourceByUrl(
    url: string
  ): Promise<{
    id: string;
    url: string;
    title: string;
    category: string;
    type: "url" | "text";
    content?: string;
  } | null> {
    const name = this.getSourcesCollectionName();
    const result = await this.client.scroll(name, {
      filter: {
        must: [{ key: "url", match: { value: url } }],
      },
      limit: 1,
      with_payload: true,
    });

    if (result.points.length === 0) {
      return null;
    }

    const point = result.points[0];
    const payload = point.payload as Record<string, unknown>;

    return {
      id: String(point.id),
      url: String(payload.url ?? ""),
      title: String(payload.title ?? ""),
      category: String(payload.category ?? ""),
      type: (payload.type as "url" | "text") ?? "url",
      content: payload.content
        ? String(payload.content)
        : undefined,
    };
  }

  /**
   * 소스 메타데이터를 삭제한다.
   * 관련 청크 벡터도 함께 삭제한다.
   */
  async deleteSource(url: string): Promise<void> {
    // 1. 소스 메타데이터 삭제
    const name = this.getSourcesCollectionName();
    await this.client.delete(name, {
      wait: true,
      filter: {
        must: [{ key: "url", match: { value: url } }],
      },
    });

    // 2. 관련 청크 벡터 삭제
    await this.deleteBySourceUrl(url);
  }
}

export {
  VectorStore,
  DENSE_VECTOR_NAME,
  SPARSE_VECTOR_NAME,
  DENSE_VECTOR_SIZE,
  SOURCES_COLLECTION_SUFFIX,
  getQdrantUrl,
  getCollectionName,
};
