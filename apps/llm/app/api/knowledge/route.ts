import fs from "fs";
import path from "path";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  isValidSession,
  SESSION_COOKIE_NAME,
} from "../admin/auth/route";
import { VectorStore } from "../../../lib/services/vector-store";

// ============================================================
// 타입 정의
// ============================================================

/** 지식 소스의 인덱싱 상태 */
interface KnowledgeSourceWithStatus {
  url: string;
  title: string;
  category: string;
  type: "url" | "text";
  content?: string;
  /** 인덱싱 상태: indexed(완료), not_indexed(미처리) */
  indexingStatus: "indexed" | "not_indexed";
}

// ============================================================
// 상수
// ============================================================

/** knowledge.json 파일 경로 */
const KNOWLEDGE_CONFIG_PATH = path.join(
  process.cwd(),
  "knowledge.json"
);

// ============================================================
// Zod 스키마
// ============================================================

/** POST 요청 본문 검증 스키마 (URL 소스) */
const addUrlSourceSchema = z.object({
  type: z.literal("url"),
  url: z.string().url("유효한 URL 형식이어야 합니다"),
  title: z.string().min(1, "title은 필수입니다"),
  category: z.string().min(1, "category는 필수입니다"),
});

/** POST 요청 본문 검증 스키마 (텍스트 소스) */
const addTextSourceSchema = z.object({
  type: z.literal("text"),
  url: z.string().min(1, "url은 필수입니다"),
  title: z.string().min(1, "title은 필수입니다"),
  category: z.string().min(1, "category는 필수입니다"),
  content: z.string().min(1, "content는 필수입니다"),
});

/** POST 요청 본문 검증 스키마 (URL 또는 텍스트) */
const addSourceSchema = z.discriminatedUnion("type", [
  addUrlSourceSchema,
  addTextSourceSchema,
]);

/** DELETE 요청 본문 검증 스키마 */
const deleteSourceSchema = z.object({
  url: z.string().min(1, "삭제할 소스의 url은 필수입니다"),
});

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 요청에서 세션 쿠키를 확인하여 관리자 인증 여부를 검증한다.
 *
 * @returns 인증 실패 시 401 NextResponse, 성공 시 null
 */
function checkAuth(request: NextRequest): NextResponse | null {
  const sessionToken = request.cookies.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!sessionToken || !isValidSession(sessionToken)) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  return null;
}

/** knowledge.json 파일에서 소스 목록을 읽는다 */
function readKnowledgeConfig(
  configPath: string = KNOWLEDGE_CONFIG_PATH
): { sources: KnowledgeSourceWithStatus[] } {
  if (!fs.existsSync(configPath)) {
    return { sources: [] };
  }

  const content = fs.readFileSync(configPath, "utf-8").trim();

  if (!content) {
    return { sources: [] };
  }

  const parsed = JSON.parse(content) as {
    sources: Array<{
      url: string;
      title: string;
      category: string;
      type?: "url" | "text";
      content?: string;
    }>;
  };

  return {
    sources: (parsed.sources ?? []).map((source) => ({
      url: source.url,
      title: source.title,
      category: source.category,
      type: source.type ?? "url",
      content: source.content,
      indexingStatus: "not_indexed" as const,
    })),
  };
}

/** knowledge.json 파일에 소스 목록을 저장한다 */
function writeKnowledgeConfig(
  sources: Array<{
    url: string;
    title: string;
    category: string;
    type?: "url" | "text";
    content?: string;
  }>,
  configPath: string = KNOWLEDGE_CONFIG_PATH
): void {
  const config = {
    sources: sources.map((s) => {
      const base: Record<string, unknown> = {
        url: s.url,
        title: s.title,
        category: s.category,
      };
      if (s.type === "text") {
        base.type = "text";
        base.content = s.content;
      }
      return base;
    }),
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// ============================================================
// API 라우트 핸들러
// ============================================================

/**
 * GET /api/knowledge
 *
 * 등록된 지식 소스 목록과 인덱싱 상태를 반환한다.
 *
 * 응답:
 * - 200: 지식 소스 목록
 * - 401: 인증 필요
 * - 500: 서버 오류
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const authError = checkAuth(request);
    if (authError) {
      return authError;
    }

    const config = readKnowledgeConfig();
    const vectorStore = new VectorStore();

    // 각 소스의 인덱싱 상태를 확인한다
    const sourcesWithStatus: KnowledgeSourceWithStatus[] =
      await Promise.all(
        config.sources.map(async (source) => {
          try {
            const hash =
              await vectorStore.getContentHashByUrl(source.url);
            return {
              ...source,
              indexingStatus: hash
                ? ("indexed" as const)
                : ("not_indexed" as const),
            };
          } catch {
            return {
              ...source,
              indexingStatus: "not_indexed" as const,
            };
          }
        })
      );

    return NextResponse.json(
      { sources: sourcesWithStatus },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("지식 소스 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge
 *
 * 새 지식 소스를 추가한다. URL 또는 마크다운 텍스트를 지원한다.
 *
 * 요청 본문:
 * - type: "url" | "text"
 * - url: string — 소스 URL (또는 텍스트 소스의 식별자)
 * - title: string — 소스 제목
 * - category: string — 카테고리
 * - content?: string — type이 "text"인 경우 텍스트 내용
 *
 * 응답:
 * - 200: 추가 성공
 * - 400: 잘못된 요청 (검증 실패 또는 중복 URL)
 * - 401: 인증 필요
 * - 500: 서버 오류
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const authError = checkAuth(request);
    if (authError) {
      return authError;
    }

    const body: unknown = await request.json();
    const parseResult = addSourceSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      return NextResponse.json(
        { error: "입력 검증에 실패했습니다.", details: errors },
        { status: 400 }
      );
    }

    const newSource = parseResult.data;
    const config = readKnowledgeConfig();

    // 중복 URL 확인
    const isDuplicate = config.sources.some(
      (s) => s.url === newSource.url
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: "이미 등록된 URL입니다." },
        { status: 400 }
      );
    }

    // 소스 추가
    const sourceToAdd: {
      url: string;
      title: string;
      category: string;
      type?: "url" | "text";
      content?: string;
    } = {
      url: newSource.url,
      title: newSource.title,
      category: newSource.category,
    };

    if (newSource.type === "text") {
      sourceToAdd.type = "text";
      sourceToAdd.content = newSource.content;
    }

    const updatedSources = [
      ...config.sources.map((s) => ({
        url: s.url,
        title: s.title,
        category: s.category,
        type: s.type,
        content: s.content,
      })),
      sourceToAdd,
    ];

    writeKnowledgeConfig(updatedSources);

    return NextResponse.json(
      {
        success: true,
        message: "지식 소스가 추가되었습니다.",
        source: sourceToAdd,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("지식 소스 추가 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge
 *
 * 지식 소스를 삭제하고 Qdrant에서 관련 벡터 데이터를 제거한다.
 *
 * 요청 본문:
 * - url: string — 삭제할 소스의 URL
 *
 * 응답:
 * - 200: 삭제 성공
 * - 400: 잘못된 요청 (검증 실패 또는 존재하지 않는 URL)
 * - 401: 인증 필요
 * - 500: 서버 오류
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const authError = checkAuth(request);
    if (authError) {
      return authError;
    }

    const body: unknown = await request.json();
    const parseResult = deleteSourceSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      return NextResponse.json(
        { error: "입력 검증에 실패했습니다.", details: errors },
        { status: 400 }
      );
    }

    const { url } = parseResult.data;
    const config = readKnowledgeConfig();

    // 소스 존재 여부 확인
    const sourceIndex = config.sources.findIndex(
      (s) => s.url === url
    );
    if (sourceIndex === -1) {
      return NextResponse.json(
        { error: "해당 URL의 지식 소스를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // Qdrant에서 벡터 데이터 삭제
    try {
      const vectorStore = new VectorStore();
      await vectorStore.deleteBySourceUrl(url);
    } catch (qdrantError: unknown) {
      console.error(
        "Qdrant 벡터 데이터 삭제 오류:",
        qdrantError
      );
      // Qdrant 오류가 발생해도 설정 파일에서는 삭제를 진행한다
    }

    // 설정 파일에서 소스 삭제
    const updatedSources = config.sources
      .filter((s) => s.url !== url)
      .map((s) => ({
        url: s.url,
        title: s.title,
        category: s.category,
        type: s.type,
        content: s.content,
      }));

    writeKnowledgeConfig(updatedSources);

    return NextResponse.json(
      {
        success: true,
        message: "지식 소스가 삭제되었습니다.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("지식 소스 삭제 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// ============================================================
// 테스트용 내보내기
// ============================================================

export {
  checkAuth,
  readKnowledgeConfig,
  writeKnowledgeConfig,
  addSourceSchema,
  deleteSourceSchema,
};
export type { KnowledgeSourceWithStatus };
