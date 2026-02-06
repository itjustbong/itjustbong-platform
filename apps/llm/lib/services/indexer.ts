import type {
  KnowledgeSource,
  IndexResult,
  TextChunk,
  VectorPoint,
  ChunkMetadata,
  CollectedContent,
} from "../types";
import { VectorStore } from "./vector-store";
import { collectFromUrl, generateContentHash } from "./collector";
import { chunkText } from "./chunker";
import { embedTexts } from "./embedding";
import { randomUUID } from "crypto";

// ============================================================
// 의존성 인터페이스 (테스트용 주입 가능)
// ============================================================

/** 인덱싱 파이프라인에 주입 가능한 의존성 */
interface IndexerDependencies {
  vectorStore?: VectorStore;
  collector?: (url: string) => Promise<CollectedContent>;
  chunker?: (
    text: string,
    metadata: ChunkMetadata
  ) => TextChunk[];
  embedder?: (texts: string[]) => Promise<number[][]>;
  hashGenerator?: (text: string) => string;
}

// ============================================================
// 내부 헬퍼
// ============================================================

/**
 * TextChunk 배열과 임베딩 벡터를 VectorPoint 배열로 변환한다.
 */
function buildVectorPoints(
  chunks: TextChunk[],
  embeddings: number[][],
  contentHash: string,
  sourceUrl: string
): VectorPoint[] {
  return chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: {
      dense: embeddings[i],
    },
    payload: {
      text: chunk.text,
      sourceUrl,
      sourceTitle: chunk.metadata.sourceTitle,
      category: chunk.metadata.category,
      chunkIndex: chunk.index,
      contentHash,
    },
  }));
}

/**
 * 단일 URL 소스를 처리한다.
 *
 * 1. URL에서 콘텐츠를 수집한다
 * 2. 콘텐츠 해시를 비교하여 변경 여부를 확인한다
 * 3. 변경이 없으면 건너뛴다
 * 4. 변경이 있으면 기존 데이터를 삭제하고 새로 인덱싱한다
 */
async function processUrlSource(
  source: KnowledgeSource,
  deps: Required<IndexerDependencies>
): Promise<IndexResult> {
  const { vectorStore, collector, chunker, embedder } = deps;

  // 1. 콘텐츠 수집
  const collected = await collector(source.url);

  // 2. 해시 비교
  const existingHash =
    await vectorStore.getContentHashByUrl(source.url);
  if (existingHash === collected.contentHash) {
    return {
      url: source.url,
      status: "skipped",
    };
  }

  // 3. 기존 데이터 삭제
  await vectorStore.deleteBySourceUrl(source.url);

  // 4. 청킹
  const metadata: ChunkMetadata = {
    sourceUrl: source.url,
    sourceTitle: source.title,
    category: source.category,
  };
  const chunks = chunker(collected.text, metadata);

  if (chunks.length === 0) {
    return {
      url: source.url,
      status: "success",
      chunksCount: 0,
    };
  }

  // 5. 임베딩
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedder(texts);

  // 6. 벡터 포인트 생성 및 저장
  const points = buildVectorPoints(
    chunks,
    embeddings,
    collected.contentHash,
    source.url
  );
  await vectorStore.upsertPoints(points);

  return {
    url: source.url,
    status: "success",
    chunksCount: chunks.length,
  };
}

/**
 * 단일 텍스트 소스를 처리한다.
 *
 * 1. 텍스트 콘텐츠의 해시를 생성한다
 * 2. 기존 해시와 비교하여 변경 여부를 확인한다
 * 3. 변경이 없으면 건너뛴다
 * 4. 변경이 있으면 기존 데이터를 삭제하고 새로 인덱싱한다
 */
async function processTextSource(
  source: KnowledgeSource,
  deps: Required<IndexerDependencies>
): Promise<IndexResult> {
  const { vectorStore, chunker, embedder, hashGenerator } = deps;

  const content = source.content ?? "";
  if (content.trim().length === 0) {
    return {
      url: source.url,
      status: "failed",
      error: "텍스트 콘텐츠가 비어있습니다.",
    };
  }

  // 1. 해시 생성
  const contentHash = hashGenerator(content);

  // 2. 해시 비교
  const existingHash =
    await vectorStore.getContentHashByUrl(source.url);
  if (existingHash === contentHash) {
    return {
      url: source.url,
      status: "skipped",
    };
  }

  // 3. 기존 데이터 삭제
  await vectorStore.deleteBySourceUrl(source.url);

  // 4. 청킹
  const metadata: ChunkMetadata = {
    sourceUrl: source.url,
    sourceTitle: source.title,
    category: source.category,
  };
  const chunks = chunker(content, metadata);

  if (chunks.length === 0) {
    return {
      url: source.url,
      status: "success",
      chunksCount: 0,
    };
  }

  // 5. 임베딩
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedder(texts);

  // 6. 벡터 포인트 생성 및 저장
  const points = buildVectorPoints(
    chunks,
    embeddings,
    contentHash,
    source.url
  );
  await vectorStore.upsertPoints(points);

  return {
    url: source.url,
    status: "success",
    chunksCount: chunks.length,
  };
}

// ============================================================
// 공개 API
// ============================================================

/**
 * 인덱싱 파이프라인을 실행한다.
 *
 * 각 소스에 대해 순차적으로 다음 단계를 수행한다:
 * 1. 콘텐츠 수집 (URL) 또는 직접 텍스트 사용
 * 2. 콘텐츠 해시 비교 → 변경 없으면 건너뜀
 * 3. 기존 벡터 데이터 삭제
 * 4. 청킹
 * 5. 임베딩
 * 6. Qdrant 저장
 *
 * @param sources - 인덱싱할 지식 소스 목록
 * @param dependencies - 테스트용 의존성 주입 (선택)
 * @returns 각 소스의 처리 결과 배열
 */
async function runIndexingPipeline(
  sources: KnowledgeSource[],
  dependencies?: IndexerDependencies
): Promise<IndexResult[]> {
  const deps: Required<IndexerDependencies> = {
    vectorStore: dependencies?.vectorStore ?? new VectorStore(),
    collector: dependencies?.collector ?? collectFromUrl,
    chunker: dependencies?.chunker ?? chunkText,
    embedder: dependencies?.embedder ?? embedTexts,
    hashGenerator:
      dependencies?.hashGenerator ?? generateContentHash,
  };

  // 컬렉션이 없으면 자동 생성한다
  await deps.vectorStore.ensureCollection();

  const results: IndexResult[] = [];

  for (const source of sources) {
    try {
      let result: IndexResult;

      if (source.type === "text") {
        result = await processTextSource(source, deps);
      } else {
        result = await processUrlSource(source, deps);
      }

      results.push(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);
      results.push({
        url: source.url,
        status: "failed",
        error: message,
      });
    }
  }

  return results;
}

export { runIndexingPipeline, buildVectorPoints };
export type { IndexerDependencies };
