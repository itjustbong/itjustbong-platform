import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsByCategory } from "@/lib/posts";
import { PostList } from "@/components/blog/PostList";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { Category, CATEGORIES, CATEGORY_LABELS } from "@/types";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

// Enable ISR with revalidation every 7 days
export const revalidate = 604800; // 7 days in seconds

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    category,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;

  if (!CATEGORIES.includes(category as Category)) {
    return {
      title: "카테고리를 찾을 수 없습니다",
    };
  }

  const categoryLabel = CATEGORY_LABELS[category as Category];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    title: `${categoryLabel} | Tech Blog`,
    description: `${categoryLabel} 관련 기술 블로그 글 모음`,
    openGraph: {
      title: `${categoryLabel} | Tech Blog`,
      description: `${categoryLabel} 관련 기술 블로그 글 모음`,
      url: `${siteUrl}/category/${category}`,
      type: "website",
    },
    alternates: {
      canonical: `${siteUrl}/category/${category}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  // 유효한 카테고리인지 확인
  if (!CATEGORIES.includes(category as Category)) {
    notFound();
  }

  const posts = await getPostsByCategory(category as Category);
  const categoryLabel = CATEGORY_LABELS[category as Category];

  return (
    <div className="container py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold md:text-4xl">{categoryLabel}</h1>
        <p className="text-muted-foreground mt-2">
          {posts.length}개의 글이 있습니다
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-8">
        <CategoryFilter selectedCategory={category as Category} />
      </div>

      {/* 글 목록 */}
      {posts.length > 0 ? (
        <PostList posts={posts} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-lg">
            아직 작성된 글이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
