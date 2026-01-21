import { PostMeta } from "@/types";
import { getCategoryLabel } from "@/lib/categories";
import Image from "next/image";
import Link from "next/link";

interface PostRowProps {
  post: PostMeta;
  showThumbnail?: boolean;
}

function getPostThumbnail(post: PostMeta): string {
  if (post.thumbnail) {
    return post.thumbnail;
  }
  // 빌드 시 생성된 정적 이미지 사용
  return `/og/${post.slug}.png`;
}

export function PostRow({ post, showThumbnail = true }: PostRowProps) {
  const thumbnailUrl = getPostThumbnail(post);
  const formattedDate = new Date(post.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <article className="group flex flex-col gap-5 py-7 transition-colors duration-200 hover:bg-muted/30 md:flex-row md:gap-6 md:rounded-xl md:px-4 md:py-6">
        {/* Thumbnail - 16:9 aspect ratio to match OG images */}
        {showThumbnail && (
          <div className="border-border/50 relative z-10 h-48 w-full shrink-0 overflow-hidden rounded-lg border shadow-sm transition-all duration-300 group-hover:shadow-md md:h-32 md:w-48">
            <Image
              src={thumbnailUrl}
              alt={post.title}
              fill
              className="object-cover object-left-bottom transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 192px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center gap-2.5">
          {/* Meta */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-primary">
              {getCategoryLabel(post.category)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <time className="text-xs text-muted-foreground">
              {formattedDate}
            </time>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary md:text-xl">
            {post.title}
          </h2>

          {/* Description */}
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.description}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground/70 transition-colors duration-200 group-hover:text-muted-foreground"
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
