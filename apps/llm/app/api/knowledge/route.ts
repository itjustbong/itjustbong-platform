import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  isValidSession,
  SESSION_COOKIE_NAME,
} from "../admin/auth/route";
import { VectorStore } from "../../../lib/services/vector-store";

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

// ============================================================
// API 라우트 핸들러
// ============================================================

/**
 * GET /api/knowledge
 *
 * Qdrant에서 등록된 지식 소스 목록과 인덱싱 상태를 반환한다.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const authError = checkAuth(request);
    if (authError) {
      return authError;
    }

    const vectorStore = new VectorStore();
    await vectorStore.ensureSourcesCollection();
    await vectorStore.ensureCollection();

    const sources = await vectorStore.getAllSources();

    return NextResponse.json(
      { sources },
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
 * 새 지식 소스를 Qdrant에 추가한다.
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
    const vectorStore = new VectorStore();
    await vectorStore.ensureSourcesCollection();

    // 중복 URL 확인
    const existing =
      await vectorStore.getSourceByUrl(newSource.url);
    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 URL입니다." },
        { status: 400 }
      );
    }

    // 소스 추가
    const sourceToAdd = {
      url: newSource.url,
      title: newSource.title,
      category: newSource.category,
      type: newSource.type,
      content:
        newSource.type === "text" ? newSource.content : undefined,
    };

    await vectorStore.addSource(sourceToAdd);

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
 * Qdrant에서 지식 소스와 관련 벡터 데이터를 삭제한다.
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
    const vectorStore = new VectorStore();
    await vectorStore.ensureSourcesCollection();

    // 소스 존재 여부 확인
    const existing = await vectorStore.getSourceByUrl(url);
    if (!existing) {
      return NextResponse.json(
        { error: "해당 URL의 지식 소스를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // 소스 메타데이터 + 청크 벡터 삭제
    await vectorStore.deleteSource(url);

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

export { checkAuth, addSourceSchema, deleteSourceSchema };
