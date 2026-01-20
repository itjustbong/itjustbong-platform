import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPostBySlug } from "@/lib/posts";

/**
 * On-Demand ISR 재검증 API
 *
 * GET /api/revalidate?slug=nextjs-app-router-guide
 * - slug 파라미터로 특정 글 재검증
 * - Header: x-revalidate-token: <REVALIDATE_SECRET>
 *
 * POST /api/revalidate
 * - Body: { path?: string, paths?: string[], slug?: string }
 * - Header: x-revalidate-token: <REVALIDATE_SECRET>
 */

function verifyToken(request: NextRequest): { valid: boolean; error?: string } {
  const token =
    request.headers.get("x-revalidate-token") ||
    request.nextUrl.searchParams.get("token");
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return { valid: false, error: "REVALIDATE_SECRET이 설정되지 않았습니다." };
  }

  if (token !== secret) {
    return { valid: false, error: "유효하지 않은 토큰입니다." };
  }

  return { valid: true };
}

// GET /api/revalidate?slug=xxx&token=xxx
export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyToken(request);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { success: false, error: tokenResult.error },
        { status: tokenResult.error?.includes("설정") ? 500 : 401 }
      );
    }

    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "slug 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 글이 존재하는지 확인
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { success: false, error: `글을 찾을 수 없습니다: ${slug}` },
        { status: 404 }
      );
    }

    const revalidatedPaths: string[] = [];

    // 글 상세 페이지 재검증
    revalidatePath(`/posts/${slug}`);
    revalidatedPaths.push(`/posts/${slug}`);

    // 메인 페이지 재검증 (글 목록 갱신)
    revalidatePath("/");
    revalidatedPaths.push("/");

    // 해당 카테고리 페이지 재검증
    revalidatePath(`/category/${post.category}`);
    revalidatedPaths.push(`/category/${post.category}`);

    return NextResponse.json({
      success: true,
      revalidated: true,
      slug,
      paths: revalidatedPaths,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { success: false, error: "재검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/revalidate (기존 방식 유지)
export async function POST(request: NextRequest) {
  try {
    const tokenResult = verifyToken(request);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { success: false, error: tokenResult.error },
        { status: tokenResult.error?.includes("설정") ? 500 : 401 }
      );
    }

    const body = await request.json();
    const { path, paths, slug } = body;

    if (!path && !paths && !slug) {
      return NextResponse.json(
        { success: false, error: "path, paths, 또는 slug가 필요합니다." },
        { status: 400 }
      );
    }

    const revalidatedPaths: string[] = [];

    // slug로 재검증
    if (slug) {
      const post = await getPostBySlug(slug);
      if (post) {
        revalidatePath(`/posts/${slug}`);
        revalidatePath("/");
        revalidatePath(`/category/${post.category}`);
        revalidatedPaths.push(
          `/posts/${slug}`,
          "/",
          `/category/${post.category}`
        );
      }
    }

    // 단일 경로 재검증
    if (path) {
      revalidatePath(path);
      revalidatedPaths.push(path);
    }

    // 다중 경로 재검증
    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p);
        revalidatedPaths.push(p);
      }
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      paths: revalidatedPaths,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { success: false, error: "재검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
