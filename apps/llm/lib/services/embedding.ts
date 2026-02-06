import { GoogleGenAI } from "@google/genai";

/**
 * GoogleGenAI 클라이언트 인스턴스를 생성한다.
 * 테스트에서 모킹할 수 있도록 별도 함수로 분리한다.
 */
function createGenAIClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

/**
 * 환경 변수에서 임베딩 모델명을 가져온다.
 * 기본값: "gemini-embedding-001"
 */
function getEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
}

/**
 * 환경 변수에서 Gemini API 키를 가져온다.
 * 설정되지 않은 경우 오류를 발생시킨다.
 */
function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
    );
  }
  return apiKey;
}

/**
 * 여러 텍스트를 벡터로 변환한다 (문서 임베딩).
 *
 * - `@google/genai`의 `GoogleGenAI.models.embedContent`를 사용한다
 * - task_type: "RETRIEVAL_DOCUMENT" (문서 검색용 임베딩)
 * - 배치 임베딩을 지원하여 여러 텍스트를 한 번에 처리한다
 *
 * @param texts - 벡터로 변환할 텍스트 배열
 * @param client - GoogleGenAI 클라이언트 (테스트용 주입 가능)
 * @returns 각 텍스트에 대한 임베딩 벡터 배열
 * @throws 임베딩 생성에 실패한 경우 오류를 발생시킨다
 */
async function embedTexts(
  texts: string[],
  client?: GoogleGenAI
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const ai = client ?? createGenAIClient(getApiKey());
  const model = getEmbeddingModel();

  const response = await ai.models.embedContent({
    model,
    contents: texts,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("임베딩 응답에 벡터 데이터가 없습니다.");
  }

  return response.embeddings.map((embedding) => {
    if (!embedding.values) {
      throw new Error("임베딩 벡터 값이 비어있습니다.");
    }
    return embedding.values;
  });
}

/**
 * 단일 쿼리 텍스트를 벡터로 변환한다 (쿼리 임베딩).
 *
 * - `@google/genai`의 `GoogleGenAI.models.embedContent`를 사용한다
 * - task_type: "RETRIEVAL_QUERY" (검색 쿼리용 임베딩)
 *
 * @param query - 벡터로 변환할 쿼리 텍스트
 * @param client - GoogleGenAI 클라이언트 (테스트용 주입 가능)
 * @returns 쿼리에 대한 임베딩 벡터
 * @throws 임베딩 생성에 실패한 경우 오류를 발생시킨다
 */
async function embedQuery(
  query: string,
  client?: GoogleGenAI
): Promise<number[]> {
  const ai = client ?? createGenAIClient(getApiKey());
  const model = getEmbeddingModel();

  const response = await ai.models.embedContent({
    model,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
    },
  });

  if (
    !response.embeddings ||
    response.embeddings.length === 0 ||
    !response.embeddings[0].values
  ) {
    throw new Error("임베딩 응답에 벡터 데이터가 없습니다.");
  }

  return response.embeddings[0].values;
}

export {
  embedTexts,
  embedQuery,
  createGenAIClient,
  getEmbeddingModel,
  getApiKey,
};
