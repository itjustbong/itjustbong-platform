import { type NextRequest, NextResponse } from "next/server";

import {
  isValidSession,
  SESSION_COOKIE_NAME,
} from "../admin/auth/route";
import { runIndexingPipeline } from "../../../lib/services/indexer";
import { VectorStore } from "../../../lib/services/vector-store";
import type { KnowledgeSource } from "../../../lib/types";

// ============================================================
// API 라우트 핸들러
// ============================================================

/**
 * POST /api/index
 *
 * 관리자 인증을 확인한 후 인덱싱 파이프라인을 실행한다.
 * Qdrant의 소스 메타데이터 컬렉션에서 소스 목록을 읽는다.
 *
 * 요청 본문 (선택):
 * - url?: string — 특정 소스만 인덱싱할 URL
 * - force?: boolean — 해시 비교 없이 강제 재인덱싱
 *
 * 본문이 없거나 url이 없으면 전체 소스를 인덱싱한다.
 *
 * 응답:
 * - 200: 인덱싱 결과 배열
 * - 400: 해당 URL의 소스를 찾을 수 없음
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

    // 2. 요청 본문 파싱
    let targetUrl: string | undefined;
    let force = false;

    try {
      const body: unknown = await request.json();
      const parsed = body as {
        url?: string;
        force?: boolean;
      };
      targetUrl = parsed.url;
      force = parsed.force === true;
    } catch {
      // 본문이 없는 경우 전체 인덱싱
    }

    // 3. Qdrant에서 소스 목록 읽기
    const vectorStore = new VectorStore();
    await vectorStore.ensureSourcesCollection();

    const allSources = await vectorStore.getAllSources();

    // KnowledgeSource 형식으로 변환
    const knowledgeSources: KnowledgeSource[] =
      allSources.map((s) => ({
        url: s.url,
        title: s.title,
        category: s.category,
        type: s.type,
        content: s.content,
      }));

    // 4. 대상 소스 결정
    let sources: KnowledgeSource[];

    if (targetUrl) {
      const found = knowledgeSources.find(
        (s) => s.url === targetUrl
      );
      if (!found) {
        return NextResponse.json(
          {
            error:
              "해당 URL의 지식 소스를 찾을 수 없습니다.",
          },
          { status: 400 }
        );
      }
      sources = [found];
    } else {
      sources = knowledgeSources;
    }

    // 5. 인덱싱 파이프라인 실행
    const results = await runIndexingPipeline(
      sources,
      undefined,
      { force }
    );

    // 6. 결과 반환
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
