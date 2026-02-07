import type { SearchResult } from "../types";
import { VectorStore } from "./vector-store";
import { embedQuery } from "./embedding";

// ============================================================
// 상수
// ============================================================

/** RRF 기본 상수 (k) */
const RRF_K = 60;

/** 기본 검색 결과 수 */
const DEFAULT_LIMIT = 5;

/** 각 검색 방식에서 가져올 후보 수 (최종 limit보다 넉넉하게) */
const PREFETCH_MULTIPLIER = 4;

// ============================================================
// 타입
// ============================================================

/** 임베딩 함수 타입 (테스트용 주입 가능) */
type EmbedQueryFn = (query: string) => Promise<number[]>;

// ============================================================
// RRF 병합 로직
// ============================================================

/**
 * 검색 결과의 고유 키를 생성한다.
 * text + sourceUrl 조합으로 중복을 판별한다.
 */
function getResultKey(result: SearchResult): string {
  return `${result.text}::${result.sourceUrl}`;
}

/**
 * Reciprocal Rank Fusion (RRF) 알고리즘으로 두 검색 결과를 병합한다.
 *
 * RRF 공식: score = sum(1 / (k + rank))
 * - k: 상수 (기본값 60)
 * - rank: 각 검색 결과 목록에서의 순위 (1부터 시작)
 *
 * @param denseResults - Dense 벡터 검색 결과
 * @param sparseResults - Sparse (BM25) 키워드 검색 결과
 * @param limit - 반환할 최대 결과 수
 * @returns RRF 점수 기준 내림차순 정렬된 검색 결과
 */
function mergeWithRRF(
  denseResults: SearchResult[],
  sparseResults: SearchResult[],
  limit: number
): SearchResult[] {
  const scoreMap = new Map<string, number>();
  const resultMap = new Map<string, SearchResult>();

  // Dense 검색 결과에 RRF 점수 부여
  denseResults.forEach((result, index) => {
    const key = getResultKey(result);
    const rank = index + 1;
    const rrfScore = 1 / (RRF_K + rank);

    scoreMap.set(key, (scoreMap.get(key) ?? 0) + rrfScore);

    if (!resultMap.has(key)) {
      resultMap.set(key, { ...result });
    }
  });

  // Sparse 검색 결과에 RRF 점수 부여
  sparseResults.forEach((result, index) => {
    const key = getResultKey(result);
    const rank = index + 1;
    const rrfScore = 1 / (RRF_K + rank);

    scoreMap.set(key, (scoreMap.get(key) ?? 0) + rrfScore);

    if (!resultMap.has(key)) {
      resultMap.set(key, { ...result });
    }
  });

  // RRF 점수를 결과에 반영하고 내림차순 정렬
  const merged: SearchResult[] = [];
  for (const [key, rrfScore] of scoreMap) {
    const result = resultMap.get(key);
    if (result) {
      merged.push({ ...result, score: rrfScore });
    }
  }

  merged.sort((a, b) => b.score - a.score);

  return merged.slice(0, limit);
}

// ============================================================
// 하이브리드 검색
// ============================================================

/**
 * 벡터 검색과 키워드 검색을 조합한 하이브리드 검색을 수행한다.
 *
 * 1. 쿼리를 벡터로 변환 (embedQuery)
 * 2. Dense 벡터 유사도 검색 수행
 * 3. Sparse (BM25) 키워드 검색 수행
 * 4. RRF (Reciprocal Rank Fusion)로 두 결과 병합
 * 5. 관련도 점수 기준 내림차순 정렬
 *
 * @param query - 검색 쿼리 텍스트
 * @param limit - 반환할 최대 결과 수 (기본값: 5)
 * @param vectorStore - VectorStore 인스턴스 (테스트용 주입 가능)
 * @param embedFn - 임베딩 함수 (테스트용 주입 가능)
 * @returns 관련도 점수 기준 내림차순 정렬된 검색 결과
 */
async function hybridSearch(
  query: string,
  limit: number = DEFAULT_LIMIT,
  vectorStore?: VectorStore,
  embedFn?: EmbedQueryFn
): Promise<SearchResult[]> {
  const store = vectorStore ?? new VectorStore();
  const embed = embedFn ?? embedQuery;

  const prefetchLimit = limit * PREFETCH_MULTIPLIER;

  // 0. 컬렉션이 존재하지 않으면 생성한다
  await store.ensureCollection();

  // 1. 쿼리를 벡터로 변환
  const queryVector = await embed(query);

  // 2. Dense 검색과 Sparse 검색을 병렬로 수행
  const [denseResults, sparseResults] = await Promise.all([
    store.searchDense(queryVector, prefetchLimit),
    store.searchSparse(query, prefetchLimit),
  ]);

  // 3. RRF로 병합하고 내림차순 정렬
  return mergeWithRRF(denseResults, sparseResults, limit);
}

export {
  hybridSearch,
  mergeWithRRF,
  getResultKey,
  RRF_K,
  DEFAULT_LIMIT,
  PREFETCH_MULTIPLIER,
};
export type { EmbedQueryFn };
