"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryInfo } from "@/types";

interface CategorySidebarProps {
  categories: CategoryInfo[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  totalCount: number;
  variant?: "vertical" | "horizontal";
}

export function CategorySidebar({
  categories,
  selected,
  onSelect,
  totalCount,
  variant = "vertical",
}: CategorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get selected category info
  const selectedCategory = categories.find((c) => c.slug === selected);
  const selectedLabel = selectedCategory ? selectedCategory.label : "전체";
  const selectedCount = selectedCategory ? selectedCategory.count : totalCount;

  // Handle category selection (mobile)
  const handleSelect = (category: string | null) => {
    onSelect(category);
    setIsOpen(false);
  };

  if (variant === "horizontal") {
    return (
      <div className="w-full">
        {/* Collapsed header - always visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-background px-4 py-3 text-sm transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedLabel}</span>
            <span className="text-xs text-muted-foreground">
              {selectedCount}개의 글
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="mt-2 rounded-xl border border-border/50 bg-background p-2">
            <nav className="space-y-0.5">
              <button
                onClick={() => handleSelect(null)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                  selected === null
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span>전체</span>
                <span
                  className={`text-xs ${
                    selected === null
                      ? "text-primary/70"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {totalCount}
                </span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => handleSelect(category.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                    selected === category.slug
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{category.label}</span>
                  <span
                    className={`text-xs ${
                      selected === category.slug
                        ? "text-primary/70"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {category.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    );
  }

  // Vertical (sidebar) variant - Desktop
  return (
    <div className="hidden lg:block">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        카테고리
      </h2>
      <nav className="space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
            selected === null
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span>전체</span>
          <span
            className={`text-xs ${
              selected === null ? "text-primary/70" : "text-muted-foreground/60"
            }`}
          >
            {totalCount}
          </span>
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onSelect(category.slug)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              selected === category.slug
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <span>{category.label}</span>
            <span
              className={`text-xs ${
                selected === category.slug
                  ? "text-primary/70"
                  : "text-muted-foreground/60"
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
