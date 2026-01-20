"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryInfo } from "@/types";

interface CategoryFilterProps {
  categories: CategoryInfo[];
  selected?: string | null;
  selectedCategory?: string;
  onSelect?: (category: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  selectedCategory,
  onSelect,
}: CategoryFilterProps) {
  const isLinkMode = selectedCategory !== undefined || !onSelect;
  const activeCategory = selectedCategory ?? selected;

  if (isLinkMode) {
    return (
      <div className="w-full overflow-x-auto">
        <div className="flex gap-2 pb-2 md:justify-center">
          <Button
            variant={!activeCategory ? "default" : "outline"}
            size="sm"
            asChild
            className="shrink-0"
          >
            <Link href="/">전체</Link>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.slug}
              variant={activeCategory === category.slug ? "default" : "outline"}
              size="sm"
              asChild
              className="shrink-0"
            >
              <Link href={`/category/${category.slug}`}>{category.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-2 pb-2 md:justify-center">
        <Button
          variant={selected === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect?.(null)}
          className="shrink-0"
        >
          전체
        </Button>
        {categories.map((category) => (
          <Button
            key={category.slug}
            variant={selected === category.slug ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect?.(category.slug)}
            className="shrink-0"
          >
            {category.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
