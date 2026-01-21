import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getAllPosts, createPost } from "@/lib/posts";
import { revalidatePath } from "next/cache";

// GET /api/posts - 글 목록 조회 (페이지네이션 지원)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let posts = await getAllPosts();

    // 카테고리 필터링
    if (category) {
      posts = posts.filter((post) => post.category === category);
    }

    // 검색어 필터링
    if (search) {
      const query = search.toLowerCase().trim();
      posts = posts.filter((post) => {
        const titleMatch = post.title.toLowerCase().includes(query);
        const descriptionMatch = post.description.toLowerCase().includes(query);
        const tagsMatch = post.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        return titleMatch || descriptionMatch || tagsMatch;
      });
    }

    const total = posts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      posts: paginatedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "글 목록을 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/posts - 새 글 발행
export async function POST(request: NextRequest) {
  // 인증 확인
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "인증에 실패했습니다.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { slug, title, description, content, category, tags, thumbnail } =
      body;

    // 필수 필드 검증
    if (!slug || !title || !content || !category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "필수 필드가 누락되었습니다.",
          },
        },
        { status: 400 }
      );
    }

    // 글 생성
    await createPost(slug, {
      title,
      description: description || "",
      content,
      category,
      tags: tags || [],
      thumbnail: thumbnail || undefined,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      published: true,
    });

    // ISR 재검증
    revalidatePath("/");
    revalidatePath(`/posts/${slug}`);
    revalidatePath(`/category/${category}`);

    return NextResponse.json({
      success: true,
      message: "글이 성공적으로 발행되었습니다.",
      slug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_ERROR",
          message: "글 발행에 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
