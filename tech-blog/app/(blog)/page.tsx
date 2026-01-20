"use client";

import { Hero } from "@/components/blog/Hero";
import { SearchBar } from "@/components/blog/SearchBar";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
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
      <Hero />

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="검색어를 입력하세요..."
            />
          </div>

          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-16">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : (
          <PostList posts={filteredPosts} />
        )}
      </div>
    </div>
  );
}
