import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs, getPostsByCategory } from "@/lib/posts";
import { extractHeadings } from "@/lib/mdx";
import { generateArticleStructuredData } from "@/lib/structured-data";
import { PostContent } from "@/components/blog/PostContent";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { AdBanner } from "@/components/ads/AdBanner";
import { PostRow } from "@/components/blog/PostRow";
import { cn } from "@/lib/utils";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const categoryLabels: Record<string, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  docker: "도커",
  blockchain: "블록체인",
  ai: "AI",
};

const categoryColors: Record<string, string> = {
  frontend: "bg-frontend/10 text-frontend border-frontend/20",
  backend: "bg-backend/10 text-backend border-backend/20",
  docker: "bg-docker/10 text-docker border-docker/20",
  blockchain: "bg-blockchain/10 text-blockchain border-blockchain/20",
  ai: "bg-ai/10 text-ai border-ai/20",
};

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
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
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
    <div className="bg-background min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Post Header - Cleaner, more spacious design */}
      <header className="border-border/40 from-background to-muted/20 border-b bg-linear-to-b">
        <div className="container mx-auto max-w-4xl px-6 py-16 md:py-20">
          <article className="space-y-6">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all hover:shadow",
                  categoryColors[post.category]
                )}
              >
                {categoryLabels[post.category]}
              </span>
              <time className="text-muted-foreground font-medium">
                {formattedDate}
              </time>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">
                {readingTime}분 읽기
              </span>
            </div>

            {/* Title - Larger, better spacing */}
            <h1 className="text-foreground text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
              {post.title}
            </h1>

            {/* Description - Better contrast */}
            <p className="text-foreground/70 text-lg leading-relaxed md:text-xl">
              {post.description}
            </p>

            {/* Tags - Improved styling */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-md px-3 py-1 text-sm transition-colors"
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

      {/* Main Content - Better layout and spacing */}
      <main className="bg-background">
        <div className="container mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
            {/* Post Content - Centered, better max-width */}
            <div className="min-w-0">
              <div className="mx-auto max-w-3xl">
                <PostContent content={post.content} />
              </div>
            </div>

            {/* Table of Contents - Sticky sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
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

      {/* Related Posts - Improved section */}
      {filteredRelatedPosts.length > 0 && (
        <section className="border-border/40 bg-muted/20 border-t">
          <div className="container mx-auto max-w-4xl px-6 py-16">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">관련 글</h2>
              <p className="text-muted-foreground mt-2">
                같은 카테고리의 다른 글을 읽어보세요
              </p>
            </div>
            <div className="space-y-6">
              {filteredRelatedPosts.map((relatedPost) => (
                <div
                  key={relatedPost.slug}
                  className="border-border/50 bg-background rounded-lg border shadow-sm transition-all hover:shadow-md"
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
