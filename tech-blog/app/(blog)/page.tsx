"use client";

import { SearchBar } from "@/components/blog/SearchBar";
import { CategorySidebar } from "@/components/blog/CategorySidebar";
import { PostList, PaginationInfo } from "@/components/blog/PostList";
import { CategoryInfo, PostMeta } from "@/types";
import { useEffect, useState, useCallback } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPostCount, setTotalPostCount] = useState(0);

  const fetchPosts = useCallback(
    async (page: number, category: string | null, search: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "10");
        if (category) params.set("category", category);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/posts?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
          setPagination(data.pagination || null);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 초기 데이터 로드 및 전체 포스트 수 가져오기
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          fetch("/api/posts?page=1&limit=10"),
          fetch("/api/categories"),
        ]);

        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
          setPagination(data.pagination || null);
          setTotalPostCount(data.pagination?.total || 0);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // 검색어나 카테고리 변경 시 페이지 리셋 및 재조회
  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1, selectedCategory, searchQuery);
  }, [searchQuery, selectedCategory, fetchPosts]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPosts(page, selectedCategory, searchQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Main Content */}
          <main className="order-1 min-w-0 flex-1">
            {/* Search Bar */}
            <div className="mb-8">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="검색어를 입력하세요..."
              />
            </div>

            {/* Mobile Category Filter */}
            <div className="mb-6 lg:hidden">
              <CategorySidebar
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                totalCount={totalPostCount}
                variant="horizontal"
              />
            </div>

            {/* Post List */}
            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              </div>
            ) : (
              <PostList
                posts={posts}
                pagination={pagination || undefined}
                onPageChange={handlePageChange}
              />
            )}
          </main>

          {/* Sidebar - Categories (Desktop: Right side, Mobile: Below search) */}
          <aside className="order-2 w-full lg:w-52 lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <CategorySidebar
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                totalCount={totalPostCount}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
