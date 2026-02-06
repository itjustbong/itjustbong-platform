import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// ============================================================
// 모킹
// ============================================================

vi.mock("../../../../lib/config/env", () => ({
  validateEnv: () => ({
    GEMINI_API_KEY: "test-api-key",
    QDRANT_URL: "http://localhost:6333",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "secret123",
    GEMINI_LLM_MODEL: "gemini-2.5-flash",
    GEMINI_EMBEDDING_MODEL: "gemini-embedding-001",
    QDRANT_COLLECTION: "knowledge_chunks",
    DAILY_REQUEST_LIMIT: 20,
  }),
}));

const mockHybridSearch = vi.fn();
const mockGenerateAnswer = vi.fn();

vi.mock("../../../lib/services/hybrid-search", () => ({
  hybridSearch: (...args: unknown[]) =>
    mockHybridSearch(...args),
}));

vi.mock("../../../lib/services/answer-generator", () => ({
  generateAnswer: (...args: unknown[]) =>
    mockGenerateAnswer(...args),
}));

vi.mock("../../../lib/services/rate-limiter", () => {
  return {
    RateLimiter: class MockRateLimiter {
      checkLimit = vi.fn(() => ({
        allowed: true,
        remaining: 19,
        resetAt: "2026-02-07T00:00:00+09:00",
      }));
      increment = vi.fn();
    },
  };
});

vi.mock("../../../lib/services/conversation", () => {
  return {
    ConversationManager: class MockConversationManager {
      createSession = vi.fn(() => "test-session-id");
      hasSession = vi.fn(() => false);
      addMessage = vi.fn();
      getHistory = vi.fn(() => []);
      summarizeIfNeeded = vi.fn(async () => []);
    },
  };
});


// ============================================================
// 헬퍼 함수
// ============================================================

function createChatRequest(
  messages: Array<{
    role: string;
    parts: Array<{ type: string; text: string }>;
  }>,
  sessionId?: string
): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, sessionId }),
    }
  );
}

// ============================================================
// 테스트
// ============================================================

beforeEach(() => {
  mockHybridSearch.mockReset();
  mockGenerateAnswer.mockReset();
  mockHybridSearch.mockResolvedValue([]);
});

describe("POST /api/chat - 입력 검증", () => {
  it("빈 메시지 배열에 400 응답을 반환한다", async () => {
    const request = createChatRequest([]);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("질문을 입력해주세요.");
  });

  it("공백만 있는 질문에 400 응답을 반환한다", async () => {
    const request = createChatRequest([
      {
        role: "user",
        parts: [{ type: "text", text: "   " }],
      },
    ]);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("질문을 입력해주세요.");
  });

  it("빈 문자열 질문에 400 응답을 반환한다", async () => {
    const request = createChatRequest([
      {
        role: "user",
        parts: [{ type: "text", text: "" }],
      },
    ]);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("질문을 입력해주세요.");
  });
});

describe("POST /api/chat - 정상 요청", () => {
  it("유효한 질문에 스트리밍 응답을 반환한다", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    mockGenerateAnswer.mockResolvedValue({
      toUIMessageStreamResponse: () =>
        new Response(mockStream, { status: 200 }),
    });

    const request = createChatRequest([
      {
        role: "user",
        parts: [
          { type: "text", text: "블로그에 대해 알려주세요" },
        ],
      },
    ]);

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockHybridSearch).toHaveBeenCalledWith(
      "블로그에 대해 알려주세요"
    );
    expect(mockGenerateAnswer).toHaveBeenCalledTimes(1);
  });

  it("검색 결과를 Answer Generator에 전달한다", async () => {
    const searchResults = [
      {
        text: "블로그 관련 내용",
        score: 0.9,
        sourceUrl: "https://example.com",
        sourceTitle: "테스트",
        category: "blog",
        chunkIndex: 0,
      },
    ];

    mockHybridSearch.mockResolvedValue(searchResults);
    mockGenerateAnswer.mockResolvedValue({
      toUIMessageStreamResponse: () =>
        new Response(null, { status: 200 }),
    });

    const request = createChatRequest([
      {
        role: "user",
        parts: [{ type: "text", text: "테스트 질문" }],
      },
    ]);

    await POST(request);

    expect(mockGenerateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "테스트 질문",
        context: searchResults,
      })
    );
  });
});

describe("POST /api/chat - 서버 오류", () => {
  it("검색 오류 시 500 응답을 반환한다", async () => {
    mockHybridSearch.mockRejectedValue(
      new Error("검색 실패")
    );

    const request = createChatRequest([
      {
        role: "user",
        parts: [{ type: "text", text: "테스트 질문" }],
      },
    ]);

    const response = await POST(request);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toContain("서버 오류가 발생했습니다");
  });
});
