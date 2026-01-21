"use client";

import Link from "next/link";
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

  const baseStyles =
    "px-3 py-1.5 text-sm transition-colors duration-200 rounded-lg shrink-0";
  const activeStyles = "bg-primary text-primary-foreground font-medium";
  const inactiveStyles =
    "text-muted-foreground hover:text-foreground hover:bg-muted/50";

  if (isLinkMode) {
    return (
      <div className="-mx-2 w-full overflow-x-auto px-2">
        <div className="flex gap-1 pb-1">
          <Link
            href="/"
            className={`${baseStyles} ${!activeCategory ? activeStyles : inactiveStyles}`}
          >
            전체
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`${baseStyles} ${activeCategory === category.slug ? activeStyles : inactiveStyles}`}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-2 w-full overflow-x-auto px-2">
      <div className="flex gap-1 pb-1">
        <button
          onClick={() => onSelect?.(null)}
          className={`${baseStyles} ${selected === null ? activeStyles : inactiveStyles}`}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onSelect?.(category.slug)}
            className={`${baseStyles} ${selected === category.slug ? activeStyles : inactiveStyles}`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
