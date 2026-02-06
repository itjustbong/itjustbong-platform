// 공통 타입 정의
// 모든 서비스 컴포넌트에서 사용하는 인터페이스를 정의한다.

// ============================================================
// Knowledge Config
// ============================================================

/** 지식 데이터 소스 (URL 또는 직접 입력 텍스트) */
interface KnowledgeSource {
  url: string;
  title: string;
  category: string;
  type: "url" | "text";
  /** type이 'text'인 경우 직접 입력된 텍스트 */
  content?: string;
}

/** 지식 설정 파일 구조 */
interface KnowledgeConfig {
  sources: KnowledgeSource[];
}

// ============================================================
// Collector
// ============================================================

/** URL에서 수집된 콘텐츠 */
interface CollectedContent {
  url: string;
  title: string;
  text: string;
  /** 변경 감지용 SHA-256 해시 */
  contentHash: string;
  /** ISO 8601 형식 수집 시각 */
  collectedAt: string;
}

// ============================================================
// Chunker
// ============================================================

/** 청킹 옵션 */
interface ChunkOptions {
  /** 청크 크기 (기본값: 500자) */
  chunkSize: number;
  /** 인접 청크 간 오버랩 크기 (기본값: 100자) */
  chunkOverlap: number;
}

/** 청크 메타데이터 */
interface ChunkMetadata {
  sourceUrl: string;
  sourceTitle: string;
  category: string;
}

/** 분할된 텍스트 청크 */
interface TextChunk {
  text: string;
  /** 청크 순서 인덱스 */
  index: number;
  metadata: ChunkMetadata;
}

// ============================================================
// Search
// ============================================================

/** 검색 결과 항목 */
interface SearchResult {
  text: string;
  /** 관련도 점수 */
  score: number;
  sourceUrl: string;
  sourceTitle: string;
  category: string;
  chunkIndex: number;
}

// ============================================================
// Conversation
// ============================================================

/** 대화 메시지 */
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO 8601 형식 타임스탬프 */
  timestamp: string;
}

/** 대화 세션 */
interface ConversationSession {
  id: string;
  messages: ConversationMessage[];
  /** LLM으로 요약된 이전 대화 내용 */
  summary?: string;
}

// ============================================================
// Answer
// ============================================================

/** 답변 생성 요청 */
interface AnswerRequest {
  question: string;
  context: SearchResult[];
  conversationHistory: ConversationMessage[];
}

// ============================================================
// Vector Store
// ============================================================

/** Qdrant에 저장되는 벡터 포인트 */
interface VectorPoint {
  id: string;
  vector: {
    dense: number[];
  };
  payload: {
    text: string;
    sourceUrl: string;
    sourceTitle: string;
    category: string;
    chunkIndex: number;
    contentHash: string;
  };
}

// ============================================================
// Rate Limiter
// ============================================================

/** 요청 횟수 제한 결과 */
interface RateLimitResult {
  allowed: boolean;
  /** 남은 요청 횟수 */
  remaining: number;
  /** KST 자정 초기화 시각 (ISO 8601) */
  resetAt: string;
}

// ============================================================
// Indexer
// ============================================================

/** 개별 소스의 인덱싱 결과 */
interface IndexResult {
  url: string;
  status: "success" | "failed" | "skipped";
  /** 성공 시 생성된 청크 수 */
  chunksCount?: number;
  /** 실패 시 오류 메시지 */
  error?: string;
}

// ============================================================
// Validation
// ============================================================

/** 검증 결과 */
interface ValidationResult {
  success: boolean;
  /** 검증 실패 시 오류 메시지 목록 */
  errors?: string[];
}

export type {
  KnowledgeSource,
  KnowledgeConfig,
  CollectedContent,
  ChunkOptions,
  ChunkMetadata,
  TextChunk,
  SearchResult,
  ConversationMessage,
  ConversationSession,
  AnswerRequest,
  VectorPoint,
  RateLimitResult,
  IndexResult,
  ValidationResult,
};
