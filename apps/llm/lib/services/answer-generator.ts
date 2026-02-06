import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import type {
  AnswerRequest,
  ConversationMessage,
  SearchResult,
} from "../types";

/** LLM 모델명 환경 변수 키 */
const LLM_MODEL_ENV_KEY = "GEMINI_LLM_MODEL";

/** 기본 LLM 모델명 */
const DEFAULT_LLM_MODEL = "gemini-2.5-flash";

/**
 * 환경 변수에서 LLM 모델명을 가져온다.
 * 설정되지 않은 경우 기본값을 반환한다.
 */
function getLlmModel(): string {
  return process.env[LLM_MODEL_ENV_KEY] || DEFAULT_LLM_MODEL;
}

/**
 * 검색 결과를 LLM 컨텍스트 문자열로 포맷팅한다.
 *
 * 각 검색 결과를 번호가 매겨진 참조 형식으로 변환하여
 * LLM이 출처를 인용할 수 있도록 한다.
 */
function formatContext(context: SearchResult[]): string {
  if (context.length === 0) {
    return "검색된 관련 문서가 없습니다.";
  }

  return context
    .map(
      (result, index) =>
        `[참조 ${index + 1}] 제목: ${result.sourceTitle}\n` +
        `URL: ${result.sourceUrl}\n` +
        `카테고리: ${result.category}\n` +
        `내용:\n${result.text}`
    )
    .join("\n\n---\n\n");
}

/**
 * 대화 히스토리를 AI SDK 메시지 형식으로 변환한다.
 */
function buildMessages(
  question: string,
  context: SearchResult[],
  conversationHistory: ConversationMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  // 이전 대화 히스토리 추가
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // 현재 질문에 컨텍스트를 포함하여 추가
  const contextStr = formatContext(context);
  const userMessage =
    `다음은 검색된 관련 문서입니다:\n\n` +
    `${contextStr}\n\n` +
    `---\n\n` +
    `사용자 질문: ${question}`;

  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

/** 시스템 프롬프트 */
const SYSTEM_PROMPT = `당신은 블로그와 이력서 콘텐츠를 기반으로 질문에 답변하는 AI 어시스턴트입니다.

## 규칙

1. **한국어로 답변**: 모든 답변은 한국어로 작성합니다.

2. **출처 명시**: 답변에 참고한 콘텐츠의 출처를 반드시 인라인으로 명시합니다.
   - 형식: [제목](URL)
   - 예시: 자세한 내용은 [모노레포 전환기](https://blog.example.com/monorepo)를 참고하세요.

3. **관련 없는 질문 거부**: 블로그 및 이력서 콘텐츠와 관련이 없는 질문(예: 날씨, 주식, 일반 상식 등)에는 답변하지 않습니다.
   - 이 경우 다음과 같이 안내합니다: "이 서비스는 블로그와 이력서 관련 질문에만 답변할 수 있습니다. 블로그 글이나 이력서에 대해 궁금한 점을 질문해주세요."

4. **정보 부족 안내**: 검색된 문서에 질문과 관련된 충분한 정보가 없는 경우, 솔직하게 안내합니다.
   - 예시: "제공된 콘텐츠에서 해당 질문에 대한 충분한 정보를 찾지 못했습니다."

5. **마크다운 형식**: 답변은 마크다운 형식으로 작성하여 가독성을 높입니다.

6. **정확성**: 검색된 문서의 내용만을 기반으로 답변하며, 추측이나 외부 지식을 사용하지 않습니다.`;

/**
 * RAG 답변을 스트리밍 방식으로 생성한다.
 *
 * Vercel AI SDK의 `streamText`를 사용하여
 * 검색된 컨텍스트와 대화 히스토리를 기반으로 답변을 생성한다.
 *
 * @param request - 질문, 검색 결과, 대화 히스토리를 포함한 요청
 * @returns streamText 결과 객체 (toUIMessageStreamResponse() 등 사용 가능)
 */
async function generateAnswer(
  request: AnswerRequest
): Promise<ReturnType<typeof streamText>> {
  const { question, context, conversationHistory } = request;

  const model = getLlmModel();
  const messages = buildMessages(
    question,
    context,
    conversationHistory
  );

  const result = streamText({
    model: google(model),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result;
}

export {
  generateAnswer,
  formatContext,
  buildMessages,
  getLlmModel,
  SYSTEM_PROMPT,
  DEFAULT_LLM_MODEL,
  LLM_MODEL_ENV_KEY,
};
