import { PostMeta } from "@/types";
import { getCategoryLabel } from "@/lib/categories";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PostRowProps {
  post: PostMeta;
  showThumbnail?: boolean;
}

// 기본 카테고리 색상 (새 카테고리는 기본 색상 사용)
const categoryColors: Record<string, string> = {
  frontend: "bg-frontend/10 text-frontend border-frontend/20",
  backend: "bg-backend/10 text-backend border-backend/20",
  docker: "bg-docker/10 text-docker border-docker/20",
  blockchain: "bg-blockchain/10 text-blockchain border-blockchain/20",
  ai: "bg-ai/10 text-ai border-ai/20",
};

const defaultCategoryColor = "bg-primary/10 text-primary border-primary/20";

function getPostThumbnail(post: PostMeta): string {
  if (post.thumbnail) {
    return post.thumbnail;
  }
  return `/posts/${post.slug}/opengraph-image`;
}

function getCategoryColor(category: string): string {
  return categoryColors[category] || defaultCategoryColor;
}

export function PostRow({ post, showThumbnail = true }: PostRowProps) {
  const thumbnailUrl = getPostThumbnail(post);
  const formattedDate = new Date(post.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/posts/${post.slug}`}>
      <article className="group border-border hover:bg-accent/30 relative flex flex-col gap-4 border-b p-6 transition-all duration-300 md:flex-row md:gap-6">
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="via-primary/5 absolute inset-0 bg-linear-to-r from-transparent to-transparent" />
        </div>

        {showThumbnail && (
          <div className="border-border/50 relative z-10 h-48 w-full shrink-0 overflow-hidden rounded-lg border shadow-sm transition-all duration-300 group-hover:shadow-md md:h-32 md:w-48">
            <Image
              src={thumbnailUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 192px"
            />
          </div>
        )}
        <div className="relative z-10 flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300 group-hover:shadow-sm",
                getCategoryColor(post.category)
              )}
            >
              {getCategoryLabel(post.category)}
            </span>
            <time className="text-muted-foreground text-sm">
              {formattedDate}
            </time>
          </div>
          <h2 className="group-hover:text-primary text-xl font-semibold tracking-tight transition-all duration-300 md:text-2xl">
            {post.title}
          </h2>
          <p className="text-muted-foreground group-hover:text-foreground/80 line-clamp-2 transition-colors duration-300">
            {post.description}
          </p>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-muted-foreground group-hover:text-foreground/60 text-xs transition-colors duration-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
