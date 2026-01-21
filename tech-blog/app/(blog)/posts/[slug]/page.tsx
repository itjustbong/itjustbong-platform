import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs, getPostsByCategory } from "@/lib/posts";
import { extractHeadings } from "@/lib/mdx";
import { generateArticleStructuredData } from "@/lib/structured-data";
import { PostContent } from "@/components/blog/PostContent";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { AdBanner } from "@/components/ads/AdBanner";
import { PostRow } from "@/components/blog/PostRow";
import { getCategoryLabel } from "@/lib/categories";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Enable ISR with revalidation every 7 days (can be triggered on-demand via /api/revalidate?slug=xxx)
export const revalidate = 604800; // 7 days in seconds

// Generate static params for all posts
export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Tech Blog";

  // 빌드 시 생성된 정적 OG 이미지 경로
  const ogImage = post.thumbnail || `${siteUrl}/og/${slug}.png`;

  return {
    title: `${post.title} | ${siteName}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [siteName],
      tags: post.tags,
      url: `${siteUrl}/posts/${slug}`,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${siteUrl}/posts/${slug}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Extract headings for table of contents
  const headings = extractHeadings(post.content);

  // Get related posts from the same category
  const relatedPosts = await getPostsByCategory(post.category);
  const filteredRelatedPosts = relatedPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate reading time (assuming 200 words per minute for Korean)
  const wordCount = post.content.length;
  const readingTime = Math.ceil(wordCount / 500); // Rough estimate for Korean

  // Generate JSON-LD structured data
  const structuredData = generateArticleStructuredData(post, slug);

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Post Header - Clean, minimal design */}
      <header className="border-b border-border/40">
        <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
          <article className="space-y-4">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-primary">
                {getCategoryLabel(post.category)}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <time className="text-muted-foreground">{formattedDate}</time>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground">{readingTime}분 읽기</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              {post.description}
            </p>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
      </header>

      {/* AdSense - Top */}
      <div className="bg-background">
        <AdBanner slot="top-banner" position="top" />
      </div>

      {/* Main Content */}
      <main className="bg-background">
        <div className="mx-auto max-w-5xl px-6 py-6 md:py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_200px]">
            {/* Post Content */}
            <div className="min-w-0">
              <div className="mx-auto max-w-3xl">
                <PostContent content={post.content} />
              </div>
            </div>

            {/* Table of Contents - Sticky sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* AdSense - Bottom */}
      <div className="bg-background">
        <AdBanner slot="bottom-banner" position="bottom" />
      </div>

      {/* Related Posts */}
      {filteredRelatedPosts.length > 0 && (
        <section className="border-t border-border/40 bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-10 md:py-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">관련 글</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                같은 카테고리의 다른 글을 읽어보세요
              </p>
            </div>
            <div className="space-y-2">
              {filteredRelatedPosts.map((relatedPost) => (
                <div
                  key={relatedPost.slug}
                  className="overflow-hidden rounded-xl bg-background"
                >
                  <PostRow post={relatedPost} showThumbnail={false} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
