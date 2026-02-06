import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  embedTexts,
  embedQuery,
  getEmbeddingModel,
  getApiKey,
} from "./embedding";
import type { GoogleGenAI } from "@google/genai";

// ============================================================
// 모킹 헬퍼
// ============================================================

/** 모킹된 GoogleGenAI 클라이언트를 생성한다 */
function createMockClient(
  embeddings: Array<{ values: number[] }>
): GoogleGenAI {
  return {
    models: {
      embedContent: vi.fn().mockResolvedValue({
        embeddings,
      }),
    },
  } as unknown as GoogleGenAI;
}

/** 768차원 더미 벡터를 생성한다 */
function createDummyVector(seed: number = 0): number[] {
  return Array.from({ length: 768 }, (_, i) => (seed + i) * 0.001);
}

// ============================================================
// getApiKey
// ============================================================

describe("getApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("GEMINI_API_KEY 환경 변수가 설정되어 있으면 반환한다", () => {
    process.env.GEMINI_API_KEY = "test-api-key";
    expect(getApiKey()).toBe("test-api-key");
  });

  it("GEMINI_API_KEY가 설정되지 않으면 오류를 발생시킨다", () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => getApiKey()).toThrow(
      "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
    );
  });
});

// ============================================================
// getEmbeddingModel
// ============================================================

describe("getEmbeddingModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("GEMINI_EMBEDDING_MODEL이 설정되어 있으면 해당 값을 반환한다", () => {
    process.env.GEMINI_EMBEDDING_MODEL = "custom-model";
    expect(getEmbeddingModel()).toBe("custom-model");
  });

  it("GEMINI_EMBEDDING_MODEL이 설정되지 않으면 기본값을 반환한다", () => {
    delete process.env.GEMINI_EMBEDDING_MODEL;
    expect(getEmbeddingModel()).toBe("gemini-embedding-001");
  });
});

// ============================================================
// embedTexts
// ============================================================

describe("embedTexts", () => {
  it("여러 텍스트에 대한 임베딩 벡터 배열을 반환한다", async () => {
    const vector1 = createDummyVector(1);
    const vector2 = createDummyVector(2);
    const mockClient = createMockClient([
      { values: vector1 },
      { values: vector2 },
    ]);

    const result = await embedTexts(
      ["첫 번째 텍스트", "두 번째 텍스트"],
      mockClient
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(vector1);
    expect(result[1]).toEqual(vector2);
  });

  it("단일 텍스트에 대한 임베딩 벡터를 반환한다", async () => {
    const vector = createDummyVector(0);
    const mockClient = createMockClient([{ values: vector }]);

    const result = await embedTexts(["단일 텍스트"], mockClient);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(vector);
  });

  it("빈 배열을 입력하면 빈 배열을 반환한다", async () => {
    const mockClient = createMockClient([]);

    const result = await embedTexts([], mockClient);

    expect(result).toEqual([]);
    // embedContent가 호출되지 않아야 한다
    expect(mockClient.models.embedContent).not.toHaveBeenCalled();
  });

  it("task_type을 RETRIEVAL_DOCUMENT로 설정하여 호출한다", async () => {
    const mockClient = createMockClient([
      { values: createDummyVector(0) },
    ]);

    await embedTexts(["테스트 텍스트"], mockClient);

    expect(mockClient.models.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      })
    );
  });

  it("환경 변수에서 모델명을 가져와 사용한다", async () => {
    const originalModel = process.env.GEMINI_EMBEDDING_MODEL;
    process.env.GEMINI_EMBEDDING_MODEL = "test-embedding-model";

    const mockClient = createMockClient([
      { values: createDummyVector(0) },
    ]);

    await embedTexts(["테스트"], mockClient);

    expect(mockClient.models.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-embedding-model",
      })
    );

    process.env.GEMINI_EMBEDDING_MODEL = originalModel;
  });

  it("임베딩 응답이 비어있으면 오류를 발생시킨다", async () => {
    const mockClient = {
      models: {
        embedContent: vi.fn().mockResolvedValue({
          embeddings: [],
        }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedTexts(["테스트"], mockClient)
    ).rejects.toThrow("임베딩 응답에 벡터 데이터가 없습니다.");
  });

  it("임베딩 응답에 embeddings가 없으면 오류를 발생시킨다", async () => {
    const mockClient = {
      models: {
        embedContent: vi.fn().mockResolvedValue({}),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedTexts(["테스트"], mockClient)
    ).rejects.toThrow("임베딩 응답에 벡터 데이터가 없습니다.");
  });

  it("임베딩 벡터 값이 없으면 오류를 발생시킨다", async () => {
    const mockClient = {
      models: {
        embedContent: vi.fn().mockResolvedValue({
          embeddings: [{ values: undefined }],
        }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedTexts(["테스트"], mockClient)
    ).rejects.toThrow("임베딩 벡터 값이 비어있습니다.");
  });

  it("API 호출 실패 시 오류를 전파한다", async () => {
    const mockClient = {
      models: {
        embedContent: vi
          .fn()
          .mockRejectedValue(new Error("API 호출 실패")),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedTexts(["테스트"], mockClient)
    ).rejects.toThrow("API 호출 실패");
  });
});

// ============================================================
// embedQuery
// ============================================================

describe("embedQuery", () => {
  it("쿼리 텍스트에 대한 임베딩 벡터를 반환한다", async () => {
    const vector = createDummyVector(0);
    const mockClient = createMockClient([{ values: vector }]);

    const result = await embedQuery("검색 쿼리", mockClient);

    expect(result).toEqual(vector);
  });

  it("task_type을 RETRIEVAL_QUERY로 설정하여 호출한다", async () => {
    const mockClient = createMockClient([
      { values: createDummyVector(0) },
    ]);

    await embedQuery("검색 쿼리", mockClient);

    expect(mockClient.models.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          taskType: "RETRIEVAL_QUERY",
        }),
      })
    );
  });

  it("contents에 단일 문자열을 전달한다", async () => {
    const mockClient = createMockClient([
      { values: createDummyVector(0) },
    ]);

    await embedQuery("테스트 쿼리", mockClient);

    expect(mockClient.models.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: "테스트 쿼리",
      })
    );
  });

  it("환경 변수에서 모델명을 가져와 사용한다", async () => {
    const originalModel = process.env.GEMINI_EMBEDDING_MODEL;
    process.env.GEMINI_EMBEDDING_MODEL = "query-model";

    const mockClient = createMockClient([
      { values: createDummyVector(0) },
    ]);

    await embedQuery("쿼리", mockClient);

    expect(mockClient.models.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "query-model",
      })
    );

    process.env.GEMINI_EMBEDDING_MODEL = originalModel;
  });

  it("임베딩 응답이 비어있으면 오류를 발생시킨다", async () => {
    const mockClient = {
      models: {
        embedContent: vi.fn().mockResolvedValue({
          embeddings: [],
        }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedQuery("쿼리", mockClient)
    ).rejects.toThrow("임베딩 응답에 벡터 데이터가 없습니다.");
  });

  it("임베딩 벡터 값이 없으면 오류를 발생시킨다", async () => {
    const mockClient = {
      models: {
        embedContent: vi.fn().mockResolvedValue({
          embeddings: [{ values: undefined }],
        }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedQuery("쿼리", mockClient)
    ).rejects.toThrow("임베딩 응답에 벡터 데이터가 없습니다.");
  });

  it("API 호출 실패 시 오류를 전파한다", async () => {
    const mockClient = {
      models: {
        embedContent: vi
          .fn()
          .mockRejectedValue(new Error("네트워크 오류")),
      },
    } as unknown as GoogleGenAI;

    await expect(
      embedQuery("쿼리", mockClient)
    ).rejects.toThrow("네트워크 오류");
  });
});
