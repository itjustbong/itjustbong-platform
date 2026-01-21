import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPostsByCategory,
  getAllCategories,
  getCategoryLabel,
} from "@/lib/posts";
import { PostList } from "@/components/blog/PostList";
import { CategoryFilter } from "@/components/blog/CategoryFilter";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export const revalidate = 604800;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categories = await getAllCategories();
  const categoryExists = categories.some((c) => c.slug === category);

  if (!categoryExists) {
    return {
      title: "카테고리를 찾을 수 없습니다",
    };
  }

  const categoryLabel = getCategoryLabel(category);
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
  const categories = await getAllCategories();
  const categoryExists = categories.some((c) => c.slug === category);

  if (!categoryExists) {
    notFound();
  }

  const posts = await getPostsByCategory(category);
  const categoryLabel = getCategoryLabel(category);

  return (
    <div className="min-h-screen">
      {/* Header section */}
      <section className="border-b border-border/50 py-10 md:py-14">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {categoryLabel}
              </h1>
              <p className="text-muted-foreground">
                {posts.length}개의 글이 있습니다
              </p>
            </div>

            {/* Category Filter */}
            <CategoryFilter categories={categories} selectedCategory={category} />
          </div>
        </div>
      </section>

      {/* Post List */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-6">
          {posts.length > 0 ? (
            <PostList posts={posts} />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-muted-foreground">아직 작성된 글이 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
