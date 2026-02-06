import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { QdrantClient } from "@qdrant/js-client-rest";

import {
  VectorStore,
  DENSE_VECTOR_NAME,
  SPARSE_VECTOR_NAME,
  DENSE_VECTOR_SIZE,
  getQdrantUrl,
  getCollectionName,
} from "./vector-store";
import type { VectorPoint } from "../types";

// ============================================================
// 모킹 헬퍼
// ============================================================

/** 모킹된 QdrantClient를 생성한다 */
function createMockClient(
  overrides: Partial<Record<string, unknown>> = {}
): QdrantClient {
  return {
    collectionExists: vi.fn().mockResolvedValue({ exists: false }),
    createCollection: vi.fn().mockResolvedValue(true),
    createPayloadIndex: vi.fn().mockResolvedValue(true),
    upsert: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([]),
    scroll: vi.fn().mockResolvedValue({ points: [] }),
    query: vi.fn().mockResolvedValue({ points: [] }),
    ...overrides,
  } as unknown as QdrantClient;
}

/** 테스트용 VectorPoint를 생성한다 */
function createTestPoint(
  id: string,
  overrides: Partial<VectorPoint["payload"]> = {}
): VectorPoint {
  return {
    id,
    vector: {
      dense: Array.from({ length: 768 }, (_, i) => i * 0.001),
    },
    payload: {
      text: "테스트 텍스트",
      sourceUrl: "https://example.com/test",
      sourceTitle: "테스트 제목",
      category: "blog",
      chunkIndex: 0,
      contentHash: "abc123",
      ...overrides,
    },
  };
}

// ============================================================
// 환경 변수 헬퍼
// ============================================================

describe("getQdrantUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("QDRANT_URL이 설정되어 있으면 해당 값을 반환한다", () => {
    process.env.QDRANT_URL = "http://custom:6333";
    expect(getQdrantUrl()).toBe("http://custom:6333");
  });

  it("QDRANT_URL이 설정되지 않으면 기본값을 반환한다", () => {
    delete process.env.QDRANT_URL;
    expect(getQdrantUrl()).toBe("http://localhost:6333");
  });
});

describe("getCollectionName", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("QDRANT_COLLECTION이 설정되어 있으면 해당 값을 반환한다", () => {
    process.env.QDRANT_COLLECTION = "custom_collection";
    expect(getCollectionName()).toBe("custom_collection");
  });

  it("QDRANT_COLLECTION이 설정되지 않으면 기본값을 반환한다", () => {
    delete process.env.QDRANT_COLLECTION;
    expect(getCollectionName()).toBe("knowledge_chunks");
  });
});

// ============================================================
// ensureCollection
// ============================================================

describe("VectorStore.ensureCollection", () => {
  it("컬렉션이 존재하지 않으면 dense + sparse 벡터로 생성한다", async () => {
    const mockClient = createMockClient({
      collectionExists: vi
        .fn()
        .mockResolvedValue({ exists: false }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    await store.ensureCollection();

    expect(mockClient.collectionExists).toHaveBeenCalledWith(
      "test_collection"
    );
    expect(mockClient.createCollection).toHaveBeenCalledWith(
      "test_collection",
      expect.objectContaining({
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
      })
    );
  });

  it("컬렉션 생성 후 sourceUrl 페이로드 인덱스를 생성한다", async () => {
    const mockClient = createMockClient({
      collectionExists: vi
        .fn()
        .mockResolvedValue({ exists: false }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    await store.ensureCollection();

    expect(mockClient.createPayloadIndex).toHaveBeenCalledWith(
      "test_collection",
      {
        field_name: "sourceUrl",
        field_schema: "keyword",
        wait: true,
      }
    );
  });

  it("컬렉션이 이미 존재하면 생성하지 않는다", async () => {
    const mockClient = createMockClient({
      collectionExists: vi
        .fn()
        .mockResolvedValue({ exists: true }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    await store.ensureCollection();

    expect(mockClient.createCollection).not.toHaveBeenCalled();
    expect(mockClient.createPayloadIndex).not.toHaveBeenCalled();
  });
});

// ============================================================
// upsertPoints
// ============================================================

describe("VectorStore.upsertPoints", () => {
  it("벡터 포인트를 named vector 형식으로 upsert한다", async () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "test_collection");
    const point = createTestPoint("point-1");

    await store.upsertPoints([point]);

    expect(mockClient.upsert).toHaveBeenCalledWith(
      "test_collection",
      expect.objectContaining({
        wait: true,
        points: [
          expect.objectContaining({
            id: "point-1",
            vector: {
              [DENSE_VECTOR_NAME]: point.vector.dense,
            },
            payload: expect.objectContaining({
              text: "테스트 텍스트",
              sourceUrl: "https://example.com/test",
              sourceTitle: "테스트 제목",
              category: "blog",
              chunkIndex: 0,
              contentHash: "abc123",
              sourceType: "url",
            }),
          }),
        ],
      })
    );
  });

  it("upsert 시 indexedAt 타임스탬프를 포함한다", async () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "test_collection");
    const point = createTestPoint("point-1");

    await store.upsertPoints([point]);

    const call = vi.mocked(mockClient.upsert).mock.calls[0];
    const upsertedPoint = (
      call[1] as { points: Array<{ payload: Record<string, unknown> }> }
    ).points[0];
    expect(upsertedPoint.payload.indexedAt).toBeDefined();
    expect(typeof upsertedPoint.payload.indexedAt).toBe("string");
  });

  it("여러 포인트를 한 번에 upsert한다", async () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "test_collection");
    const points = [
      createTestPoint("point-1"),
      createTestPoint("point-2", { chunkIndex: 1 }),
      createTestPoint("point-3", { chunkIndex: 2 }),
    ];

    await store.upsertPoints(points);

    const call = vi.mocked(mockClient.upsert).mock.calls[0];
    const upsertedPoints = (
      call[1] as { points: unknown[] }
    ).points;
    expect(upsertedPoints).toHaveLength(3);
  });

  it("빈 배열을 입력하면 upsert를 호출하지 않는다", async () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "test_collection");

    await store.upsertPoints([]);

    expect(mockClient.upsert).not.toHaveBeenCalled();
  });
});

// ============================================================
// deleteBySourceUrl
// ============================================================

describe("VectorStore.deleteBySourceUrl", () => {
  it("sourceUrl 필터로 포인트를 삭제한다", async () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "test_collection");

    await store.deleteBySourceUrl("https://example.com/post-1");

    expect(mockClient.delete).toHaveBeenCalledWith(
      "test_collection",
      {
        wait: true,
        filter: {
          must: [
            {
              key: "sourceUrl",
              match: {
                value: "https://example.com/post-1",
              },
            },
          ],
        },
      }
    );
  });
});

// ============================================================
// searchDense
// ============================================================

describe("VectorStore.searchDense", () => {
  it("named vector로 dense 검색을 수행한다", async () => {
    const queryVector = Array.from({ length: 768 }, () => 0.1);
    const mockClient = createMockClient({
      search: vi.fn().mockResolvedValue([
        {
          id: "1",
          score: 0.95,
          payload: {
            text: "검색 결과 텍스트",
            sourceUrl: "https://example.com/result",
            sourceTitle: "결과 제목",
            category: "blog",
            chunkIndex: 0,
          },
        },
      ]),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const results = await store.searchDense(queryVector, 5);

    expect(mockClient.search).toHaveBeenCalledWith(
      "test_collection",
      {
        vector: {
          name: DENSE_VECTOR_NAME,
          vector: queryVector,
        },
        limit: 5,
        with_payload: true,
      }
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      text: "검색 결과 텍스트",
      score: 0.95,
      sourceUrl: "https://example.com/result",
      sourceTitle: "결과 제목",
      category: "blog",
      chunkIndex: 0,
    });
  });

  it("검색 결과가 없으면 빈 배열을 반환한다", async () => {
    const mockClient = createMockClient({
      search: vi.fn().mockResolvedValue([]),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const results = await store.searchDense(
      Array.from({ length: 768 }, () => 0.1),
      5
    );

    expect(results).toEqual([]);
  });

  it("여러 검색 결과를 올바르게 매핑한다", async () => {
    const mockClient = createMockClient({
      search: vi.fn().mockResolvedValue([
        {
          id: "1",
          score: 0.95,
          payload: {
            text: "첫 번째",
            sourceUrl: "https://example.com/1",
            sourceTitle: "제목 1",
            category: "blog",
            chunkIndex: 0,
          },
        },
        {
          id: "2",
          score: 0.85,
          payload: {
            text: "두 번째",
            sourceUrl: "https://example.com/2",
            sourceTitle: "제목 2",
            category: "resume",
            chunkIndex: 1,
          },
        },
      ]),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const results = await store.searchDense(
      Array.from({ length: 768 }, () => 0.1),
      10
    );

    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(0.95);
    expect(results[1].score).toBe(0.85);
    expect(results[0].category).toBe("blog");
    expect(results[1].category).toBe("resume");
  });
});

// ============================================================
// getContentHashByUrl
// ============================================================

describe("VectorStore.getContentHashByUrl", () => {
  it("URL에 해당하는 콘텐츠 해시를 반환한다", async () => {
    const mockClient = createMockClient({
      scroll: vi.fn().mockResolvedValue({
        points: [
          {
            id: "1",
            payload: {
              contentHash: "hash-abc-123",
            },
          },
        ],
      }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const hash = await store.getContentHashByUrl(
      "https://example.com/post"
    );

    expect(mockClient.scroll).toHaveBeenCalledWith(
      "test_collection",
      {
        filter: {
          must: [
            {
              key: "sourceUrl",
              match: {
                value: "https://example.com/post",
              },
            },
          ],
        },
        limit: 1,
        with_payload: ["contentHash"],
      }
    );
    expect(hash).toBe("hash-abc-123");
  });

  it("URL에 해당하는 포인트가 없으면 null을 반환한다", async () => {
    const mockClient = createMockClient({
      scroll: vi.fn().mockResolvedValue({ points: [] }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const hash = await store.getContentHashByUrl(
      "https://example.com/nonexistent"
    );

    expect(hash).toBeNull();
  });

  it("contentHash가 없는 포인트에 대해 null을 반환한다", async () => {
    const mockClient = createMockClient({
      scroll: vi.fn().mockResolvedValue({
        points: [
          {
            id: "1",
            payload: {},
          },
        ],
      }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const hash = await store.getContentHashByUrl(
      "https://example.com/post"
    );

    expect(hash).toBeNull();
  });
});

// ============================================================
// searchSparse
// ============================================================

describe("VectorStore.searchSparse", () => {
  it("BM25 sparse 검색을 수행한다", async () => {
    const mockClient = createMockClient({
      query: vi.fn().mockResolvedValue({
        points: [
          {
            id: "1",
            score: 0.8,
            payload: {
              text: "키워드 검색 결과",
              sourceUrl: "https://example.com/result",
              sourceTitle: "결과 제목",
              category: "blog",
              chunkIndex: 0,
            },
          },
        ],
      }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const results = await store.searchSparse("검색 키워드", 5);

    expect(mockClient.query).toHaveBeenCalledWith(
      "test_collection",
      {
        query: {
          text: "검색 키워드",
          model: "Qdrant/bm25",
        },
        using: SPARSE_VECTOR_NAME,
        limit: 5,
        with_payload: true,
      }
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      text: "키워드 검색 결과",
      score: 0.8,
      sourceUrl: "https://example.com/result",
      sourceTitle: "결과 제목",
      category: "blog",
      chunkIndex: 0,
    });
  });

  it("검색 결과가 없으면 빈 배열을 반환한다", async () => {
    const mockClient = createMockClient({
      query: vi.fn().mockResolvedValue({ points: [] }),
    });
    const store = new VectorStore(mockClient, "test_collection");

    const results = await store.searchSparse("검색어", 5);

    expect(results).toEqual([]);
  });
});

// ============================================================
// 생성자 및 접근자
// ============================================================

describe("VectorStore 생성자", () => {
  it("주입된 클라이언트와 컬렉션 이름을 사용한다", () => {
    const mockClient = createMockClient();
    const store = new VectorStore(mockClient, "custom_collection");

    expect(store.getClient()).toBe(mockClient);
    expect(store.getCollectionName()).toBe("custom_collection");
  });
});
