"use client";

import { SearchBar } from "@/components/blog/SearchBar";
import { CategorySidebar } from "@/components/blog/CategorySidebar";
import { PostList } from "@/components/blog/PostList";
import { CategoryInfo, PostMeta } from "@/types";
import { useEffect, useState } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate total post count
  const totalPostCount = posts.length;

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          fetch("/api/posts"),
          fetch("/api/categories"),
        ]);

        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
          setFilteredPosts(data.posts || []);
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

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...posts];

    if (selectedCategory) {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((post) => {
        const titleMatch = post.title.toLowerCase().includes(query);
        const descriptionMatch = post.description.toLowerCase().includes(query);
        const tagsMatch = post.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        return titleMatch || descriptionMatch || tagsMatch;
      });
    }

    setFilteredPosts(filtered);
  }, [searchQuery, selectedCategory, posts]);

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
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              </div>
            ) : (
              <PostList posts={filteredPosts} />
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
