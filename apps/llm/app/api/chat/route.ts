import { type NextRequest } from "next/server";
import {
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { RateLimiter } from "../../../lib/services/rate-limiter";
import { ConversationManager } from "../../../lib/services/conversation";
import { hybridSearch } from "../../../lib/services/hybrid-search";
import { generateAnswer } from "../../../lib/services/answer-generator";
import type { ConversationMessage, SearchResult } from "../../../lib/types";

// ============================================================
// 싱글톤 인스턴스
// ============================================================

/** 모듈 레벨 Rate Limiter 싱글톤 */
const rateLimiter = new RateLimiter();

/** 모듈 레벨 Conversation Manager 싱글톤 */
const conversationManager = new ConversationManager();

// ============================================================
// 헬퍼 함수
// ============================================================

/** 스트리밍 응답 최대 지속 시간 (초) */
export const maxDuration = 30;

/**
 * 요청 헤더에서 클라이언트 IP를 추출한다.
 * x-forwarded-for → x-real-ip → "anonymous" 순서로 확인한다.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for는 쉼표로 구분된 IP 목록일 수 있다
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "anonymous";
}

/**
 * 질문 문자열이 유효한지 검증한다.
 * 빈 문자열이거나 공백만으로 구성된 경우 false를 반환한다.
 */
function isValidQuestion(question: string): boolean {
  return question.trim().length > 0;
}

/**
 * Qdrant 연결 실패(ECONNREFUSED 등)로 판단되는 에러인지 확인한다.
 * 로컬 개발 시 Qdrant 미실행 시 graceful degradation을 위해 사용한다.
 */
function isQdrantConnectionError(error: unknown): boolean {
  if (!(error instanceof TypeError) || !error.message.includes("fetch failed")) {
    return false;
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause) return false;

  // cause.code (일반 Error)
  const code = (cause as { code?: string }).code;
  if (code === "ECONNREFUSED") return true;

  // AggregateError.errors 내부 (Node.js fetch 실패 시)
  const agg = cause as { errors?: Array<{ code?: string }> };
  const codes = agg.errors?.map((e) => e.code) ?? [];
  return codes.includes("ECONNREFUSED");
}

/**
 * UIMessage 배열에서 마지막 사용자 메시지의 텍스트를 추출한다.
 */
function extractLastUserQuestion(
  messages: UIMessage[]
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      // UIMessage의 parts에서 텍스트를 추출
      const parts = messages[i].parts;
      const textParts = parts
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text"
        )
        .map((part) => part.text);

      if (textParts.length > 0) {
        return textParts.join("");
      }

      // parts가 비어있는 경우 빈 문자열 반환
      return "";
    }
  }
  return null;
}

// ============================================================
// API 라우트 핸들러
// ============================================================

/**
 * POST /api/chat
 *
 * 사용자 질문을 수신하여 RAG 기반 스트리밍 답변을 반환한다.
 *
 * 요청 본문:
 * - messages: UIMessage[] — AI SDK useChat 훅이 전송하는 메시지 배열
 * - sessionId?: string — 대화 세션 ID (선택)
 *
 * 응답:
 * - 200: UI Message Stream (스트리밍)
 * - 400: 빈 질문
 * - 429: 요청 한도 초과
 * - 500: 서버 오류
 */
export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    // 1. 요청 본문 파싱
    const body: unknown = await request.json();
    const { messages, sessionId } = body as {
      messages: UIMessage[];
      sessionId?: string;
    };

    // 2. 마지막 사용자 질문 추출 및 검증
    const question = extractLastUserQuestion(messages);

    if (question === null || !isValidQuestion(question)) {
      return Response.json(
        { error: "질문을 입력해주세요." },
        { status: 400 }
      );
    }

    // 3. Rate Limiter 확인
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimiter.checkLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error:
            "일일 요청 한도를 초과했습니다. " +
            "내일 다시 시도해주세요.",
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    // 요청 카운터 증가
    rateLimiter.increment(clientIp);

    // 4. Conversation Manager로 세션 관리
    let currentSessionId = sessionId;
    if (
      !currentSessionId ||
      !conversationManager.hasSession(currentSessionId)
    ) {
      currentSessionId = conversationManager.createSession();
    }

    // 사용자 메시지를 대화 히스토리에 추가
    const userMessage: ConversationMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    conversationManager.addMessage(currentSessionId, userMessage);

    // 대화 히스토리 가져오기 (요약 포함)
    const conversationHistory =
      await conversationManager.summarizeIfNeeded(
        currentSessionId
      );

    // 5. Hybrid Search로 관련 문서 검색 (최대 5개)
    let searchResults: SearchResult[];
    try {
      searchResults = await hybridSearch(question, 5);
    } catch (searchError) {
      if (isQdrantConnectionError(searchError)) {
        console.warn(
          "[LLM] Qdrant 연결 실패 — RAG 없이 응답합니다. Qdrant를 실행하세요: docker compose up qdrant -d"
        );
        searchResults = [];
      } else {
        throw searchError;
      }
    }

    // 6. Answer Generator로 스트리밍 답변 생성
    const result = await generateAnswer({
      question,
      context: searchResults,
      conversationHistory,
    });

    // 7. UI Message Stream Response 반환
    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("채팅 API 오류:", error);

    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";

    return Response.json(
      { error: `서버 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}
