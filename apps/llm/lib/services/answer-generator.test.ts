import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnswerRequest, SearchResult } from "../types";
import {
  formatContext,
  buildMessages,
  getLlmModel,
  generateAnswer,
  SYSTEM_PROMPT,
  DEFAULT_LLM_MODEL,
  LLM_MODEL_ENV_KEY,
} from "./answer-generator";

// ============================================================
// streamText 모킹
// ============================================================

const mockStreamText = vi.fn();

vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => `google-model:${model}`),
}));

// ============================================================
// 테스트 헬퍼
// ============================================================

/** 테스트용 검색 결과를 생성한다 */
function createSearchResult(
  overrides?: Partial<SearchResult>
): SearchResult {
  return {
    text: "테스트 콘텐츠입니다.",
    score: 0.95,
    sourceUrl: "https://blog.example.com/post-1",
    sourceTitle: "테스트 블로그 포스트",
    category: "blog",
    chunkIndex: 0,
    ...overrides,
  };
}

/** 테스트용 AnswerRequest를 생성한다 */
function createAnswerRequest(
  overrides?: Partial<AnswerRequest>
): AnswerRequest {
  return {
    question: "모노레포 구조에 대해 설명해주세요",
    context: [createSearchResult()],
    conversationHistory: [],
    ...overrides,
  };
}

// ============================================================
// getLlmModel
// ============================================================

describe("getLlmModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("환경 변수가 설정되어 있으면 해당 값을 반환한다", () => {
    process.env[LLM_MODEL_ENV_KEY] = "gemini-2.0-pro";
    expect(getLlmModel()).toBe("gemini-2.0-pro");
  });

  it("환경 변수가 설정되지 않으면 기본값을 반환한다", () => {
    delete process.env[LLM_MODEL_ENV_KEY];
    expect(getLlmModel()).toBe(DEFAULT_LLM_MODEL);
  });

  it("환경 변수가 빈 문자열이면 기본값을 반환한다", () => {
    process.env[LLM_MODEL_ENV_KEY] = "";
    expect(getLlmModel()).toBe(DEFAULT_LLM_MODEL);
  });
});

// ============================================================
// formatContext
// ============================================================

describe("formatContext", () => {
  it("검색 결과를 번호가 매겨진 참조 형식으로 포맷팅한다", () => {
    const results: SearchResult[] = [
      createSearchResult({
        sourceTitle: "첫 번째 포스트",
        sourceUrl: "https://blog.example.com/1",
        text: "첫 번째 내용",
        category: "blog",
      }),
      createSearchResult({
        sourceTitle: "두 번째 포스트",
        sourceUrl: "https://blog.example.com/2",
        text: "두 번째 내용",
        category: "resume",
      }),
    ];

    const formatted = formatContext(results);

    expect(formatted).toContain("[참조 1]");
    expect(formatted).toContain("제목: 첫 번째 포스트");
    expect(formatted).toContain(
      "URL: https://blog.example.com/1"
    );
    expect(formatted).toContain("카테고리: blog");
    expect(formatted).toContain("첫 번째 내용");

    expect(formatted).toContain("[참조 2]");
    expect(formatted).toContain("제목: 두 번째 포스트");
    expect(formatted).toContain(
      "URL: https://blog.example.com/2"
    );
    expect(formatted).toContain("카테고리: resume");
    expect(formatted).toContain("두 번째 내용");
  });

  it("빈 검색 결과에 대해 안내 메시지를 반환한다", () => {
    const formatted = formatContext([]);
    expect(formatted).toBe("검색된 관련 문서가 없습니다.");
  });

  it("단일 검색 결과를 올바르게 포맷팅한다", () => {
    const results = [createSearchResult()];
    const formatted = formatContext(results);

    expect(formatted).toContain("[참조 1]");
    expect(formatted).not.toContain("[참조 2]");
    expect(formatted).not.toContain("---");
  });

  it("여러 검색 결과 사이에 구분선을 포함한다", () => {
    const results = [
      createSearchResult({ text: "내용 A" }),
      createSearchResult({ text: "내용 B" }),
    ];
    const formatted = formatContext(results);

    expect(formatted).toContain("---");
  });
});

// ============================================================
// buildMessages
// ============================================================

describe("buildMessages", () => {
  it("대화 히스토리 없이 질문과 컨텍스트로 메시지를 구성한다", () => {
    const context = [createSearchResult()];
    const messages = buildMessages(
      "테스트 질문",
      context,
      []
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toContain("테스트 질문");
    expect(messages[0].content).toContain(
      "검색된 관련 문서"
    );
  });

  it("대화 히스토리를 메시지 앞에 포함한다", () => {
    const history = [
      {
        role: "user" as const,
        content: "이전 질문",
        timestamp: "2024-01-01T00:00:00Z",
      },
      {
        role: "assistant" as const,
        content: "이전 답변",
        timestamp: "2024-01-01T00:00:01Z",
      },
    ];

    const messages = buildMessages(
      "후속 질문",
      [createSearchResult()],
      history
    );

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({
      role: "user",
      content: "이전 질문",
    });
    expect(messages[1]).toEqual({
      role: "assistant",
      content: "이전 답변",
    });
    expect(messages[2].role).toBe("user");
    expect(messages[2].content).toContain("후속 질문");
  });

  it("빈 컨텍스트에서도 메시지를 올바르게 구성한다", () => {
    const messages = buildMessages("질문", [], []);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toContain(
      "검색된 관련 문서가 없습니다."
    );
    expect(messages[0].content).toContain("질문");
  });

  it("사용자 메시지에 컨텍스트와 질문을 모두 포함한다", () => {
    const context = [
      createSearchResult({
        sourceTitle: "블로그 제목",
        text: "블로그 내용",
      }),
    ];

    const messages = buildMessages(
      "이 블로그에 대해 알려주세요",
      context,
      []
    );

    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.content).toContain("블로그 제목");
    expect(lastMessage.content).toContain("블로그 내용");
    expect(lastMessage.content).toContain(
      "이 블로그에 대해 알려주세요"
    );
  });
});

// ============================================================
// SYSTEM_PROMPT
// ============================================================

describe("SYSTEM_PROMPT", () => {
  it("한국어 답변 지시를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("한국어");
  });

  it("출처 명시 형식을 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("[제목](URL)");
  });

  it("관련 없는 질문 거부 지시를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain(
      "블로그와 이력서 관련 질문에만 답변"
    );
  });

  it("정보 부족 안내 지시를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("충분한 정보를 찾지 못했습니다");
  });

  it("마크다운 형식 지시를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("마크다운");
  });
});

// ============================================================
// generateAnswer
// ============================================================

describe("generateAnswer", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockStreamText.mockReset();
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: vi.fn(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("streamText를 올바른 인자로 호출한다", async () => {
    const request = createAnswerRequest();

    await generateAnswer(request);

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    const callArgs = mockStreamText.mock.calls[0][0];

    // 모델이 google() 함수를 통해 생성되었는지 확인
    expect(callArgs.model).toBe(
      `google-model:${DEFAULT_LLM_MODEL}`
    );
    // 시스템 프롬프트가 포함되었는지 확인
    expect(callArgs.system).toBe(SYSTEM_PROMPT);
    // 메시지가 포함되었는지 확인
    expect(callArgs.messages).toBeDefined();
    expect(Array.isArray(callArgs.messages)).toBe(true);
  });

  it("환경 변수에서 모델명을 가져와 사용한다", async () => {
    process.env[LLM_MODEL_ENV_KEY] = "gemini-2.0-pro";
    const request = createAnswerRequest();

    await generateAnswer(request);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.model).toBe("google-model:gemini-2.0-pro");
  });

  it("검색 결과를 컨텍스트로 포함한 메시지를 전달한다", async () => {
    const request = createAnswerRequest({
      context: [
        createSearchResult({
          sourceTitle: "테스트 제목",
          text: "테스트 내용",
        }),
      ],
    });

    await generateAnswer(request);

    const callArgs = mockStreamText.mock.calls[0][0];
    const lastMessage =
      callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.content).toContain("테스트 제목");
    expect(lastMessage.content).toContain("테스트 내용");
  });

  it("대화 히스토리를 메시지에 포함한다", async () => {
    const request = createAnswerRequest({
      conversationHistory: [
        {
          role: "user",
          content: "이전 질문",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          role: "assistant",
          content: "이전 답변",
          timestamp: "2024-01-01T00:00:01Z",
        },
      ],
    });

    await generateAnswer(request);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(3);
    expect(callArgs.messages[0]).toEqual({
      role: "user",
      content: "이전 질문",
    });
    expect(callArgs.messages[1]).toEqual({
      role: "assistant",
      content: "이전 답변",
    });
  });

  it("streamText 결과 객체를 반환한다", async () => {
    const mockResult = {
      toUIMessageStreamResponse: vi.fn(),
      textStream: "mock-stream",
    };
    mockStreamText.mockReturnValue(mockResult);

    const result = await generateAnswer(createAnswerRequest());

    expect(result).toBe(mockResult);
  });

  it("빈 컨텍스트로도 정상 동작한다", async () => {
    const request = createAnswerRequest({ context: [] });

    await generateAnswer(request);

    const callArgs = mockStreamText.mock.calls[0][0];
    const lastMessage =
      callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.content).toContain(
      "검색된 관련 문서가 없습니다."
    );
  });

  it("빈 대화 히스토리로도 정상 동작한다", async () => {
    const request = createAnswerRequest({
      conversationHistory: [],
    });

    await generateAnswer(request);

    const callArgs = mockStreamText.mock.calls[0][0];
    // 대화 히스토리 없이 현재 질문만 포함
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].role).toBe("user");
  });
});
