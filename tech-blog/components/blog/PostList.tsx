import { PostMeta } from "@/types";
import { PostRow } from "./PostRow";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PostListProps {
  posts: PostMeta[];
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
}

export function PostList({ posts, pagination, onPageChange }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="flex min-h-[250px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-base">
            검색 결과가 없습니다.
          </p>
          <p className="text-muted-foreground/70 mt-1.5 text-sm">
            다른 검색어나 카테고리를 시도해보세요.
          </p>
        </div>
      </div>
    );
  }

  const renderPageNumbers = () => {
    if (!pagination) return null;
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }

    return pages.map((p, idx) =>
      typeof p === "string" ? (
        <span key={`ellipsis-${idx}`} className="text-muted-foreground px-2">
          {p}
        </span>
      ) : (
        <button
          key={p}
          onClick={() => onPageChange?.(p)}
          className={`min-w-[36px] rounded-md px-3 py-1.5 text-sm transition-colors ${
            p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {p}
        </button>
      )
    );
  };

  return (
    <div className="w-full">
      <div className="space-y-2">
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="hover:bg-muted rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {renderPageNumbers()}
          <button
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="hover:bg-muted rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
