import { PostMeta } from "@/types";
import { PostRow } from "./PostRow";

interface PostListProps {
  posts: PostMeta[];
  showPagination?: boolean;
}

export function PostList({ posts, showPagination = false }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="flex min-h-[250px] items-center justify-center">
        <div className="text-center">
          <p className="text-base text-muted-foreground">
            검색 결과가 없습니다.
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground/70">
            다른 검색어나 카테고리를 시도해보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-2">
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
        ))}
      </div>
      {showPagination && (
        <div className="mt-10 flex justify-center">
          {/* Pagination can be added here in the future */}
        </div>
      )}
    </div>
  );
}
