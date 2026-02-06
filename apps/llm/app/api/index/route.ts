import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import {
  isValidSession,
  SESSION_COOKIE_NAME,
} from "../admin/auth/route";
import { runIndexingPipeline } from "../../../lib/services/indexer";
import type { KnowledgeSource } from "../../../lib/types";

// ============================================================
// 상수
// ============================================================

/** knowledge.json 파일 경로 */
const KNOWLEDGE_CONFIG_PATH = path.join(
  process.cwd(),
  "knowledge.json"
);

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * knowledge.json 파일에서 소스 목록을 읽는다.
 */
function readKnowledgeSources(
  configPath: string = KNOWLEDGE_CONFIG_PATH
): KnowledgeSource[] {
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const content = fs.readFileSync(configPath, "utf-8").trim();

  if (!content) {
    return [];
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

  return (parsed.sources ?? []).map((source) => ({
    url: source.url,
    title: source.title,
    category: source.category,
    type: source.type ?? "url",
    content: source.content,
  }));
}

// ============================================================
// API 라우트 핸들러
// ============================================================

/**
 * POST /api/index
 *
 * 관리자 인증을 확인한 후 인덱싱 파이프라인을 실행한다.
 * knowledge.json에 등록된 모든 소스에 대해 수집, 청킹, 벡터화를
 * 순차적으로 수행하고 각 소스의 처리 결과를 반환한다.
 *
 * 응답:
 * - 200: 인덱싱 결과 배열
 * - 401: 인증 필요
 * - 500: 서버 오류
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // 1. 관리자 인증 확인
    const sessionToken = request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (!sessionToken || !isValidSession(sessionToken)) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 2. knowledge.json에서 소스 목록 읽기
    const sources = readKnowledgeSources();

    // 3. 인덱싱 파이프라인 실행
    const results = await runIndexingPipeline(sources);

    // 4. 결과 반환
    return NextResponse.json(
      { results },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("인덱싱 API 오류:", error);

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// ============================================================
// 테스트용 내보내기
// ============================================================

export { readKnowledgeSources };
