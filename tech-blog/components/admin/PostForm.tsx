"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "./MarkdownEditor";
import { ImageUploader } from "./ImageUploader";
import {
  Save,
  Send,
  X,
  Plus,
  Image as ImageIcon,
  Sparkles,
  Clock,
  ArrowLeft,
  FileText,
  Tag,
  Folder,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { Category, CategoryInfo, Post, Draft } from "@/types";
import Link from "next/link";

interface PostFormProps {
  initialData?: Partial<Post> | Draft;
  mode: "create" | "edit";
  slug?: string;
  draftId?: string;
}

interface FormData {
  title: string;
  description: string;
  content: string;
  category: Category;
  tags: string[];
  thumbnail: string;
}

export function PostForm({ initialData, mode, slug, draftId }: PostFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [formData, setFormData] = useState<FormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    category: initialData?.category || "",
    tags: initialData?.tags || [],
    thumbnail: initialData?.thumbnail || "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDraftIdRef = useRef<string | null>(draftId || null);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // 카테고리 목록 가져오기
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
          // 초기 카테고리가 없으면 첫 번째 카테고리 선택
          if (!formData.category && data.categories?.length > 0) {
            setFormData((prev) => ({
              ...prev,
              category: data.categories[0].slug,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (mode === "edit") return;

    const saveInterval = setInterval(async () => {
      const currentFormData = formDataRef.current;
      if (currentFormData.content || currentFormData.title) {
        try {
          const response = await fetch("/api/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: currentDraftIdRef.current,
              ...currentFormData,
            }),
          });

          const data = await response.json();
          if (data.success) {
            currentDraftIdRef.current = data.draft.id;
            setLastSaved(new Date());
          }
        } catch {
          // 자동 저장 실패는 조용히 무시
        }
      }
    }, 30000);

    autoSaveTimerRef.current = saveInterval;

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [mode]);

  const handleChange = useCallback(
    (field: keyof FormData, value: string | string[] | Category) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  }, [tagInput, formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleAddNewCategory = useCallback(() => {
    const slug = newCategory
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-");

    if (slug && !categories.some((c) => c.slug === slug)) {
      setCategories((prev) => [
        ...prev,
        { slug, label: newCategory, count: 0 },
      ]);
      setFormData((prev) => ({ ...prev, category: slug }));
      setNewCategory("");
      setShowNewCategory(false);
    }
  }, [newCategory, categories]);

  const handleImageUpload = useCallback(
    (imageUrl: string, markdownSyntax: string) => {
      setFormData((prev) => ({
        ...prev,
        content: prev.content + "\n\n" + markdownSyntax + "\n",
      }));
      setShowImageUploader(false);
    },
    []
  );

  const handleSaveDraft = useCallback(
    async (isAutoSave = false) => {
      if (isSaving) return;

      setIsSaving(true);
      try {
        const response = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDraftIdRef.current,
            ...formData,
          }),
        });

        const data = await response.json();

        if (data.success) {
          currentDraftIdRef.current = data.draft.id;
          setLastSaved(new Date());
          if (!isAutoSave) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
          }
        } else {
          if (!isAutoSave) {
            alert(data.error?.message || "임시저장에 실패했습니다.");
          }
        }
      } catch {
        if (!isAutoSave) {
          alert("임시저장 중 오류가 발생했습니다.");
        }
      } finally {
        setIsSaving(false);
      }
    },
    [formData, isSaving]
  );

  const handlePublish = useCallback(async () => {
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!formData.description.trim()) {
      alert("설명을 입력해주세요.");
      return;
    }
    if (!formData.content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }
    if (!formData.category) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    setIsPublishing(true);
    try {
      const postSlug =
        slug ||
        formData.title
          .toLowerCase()
          .replace(/[^a-z0-9가-힣\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .substring(0, 50);

      const url = mode === "edit" ? `/api/posts/${slug}` : "/api/posts";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: postSlug,
          ...formData,
          published: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (currentDraftIdRef.current) {
          await fetch(`/api/drafts/${currentDraftIdRef.current}`, {
            method: "DELETE",
          });
        }

        router.push("/admin/dashboard");
        router.refresh();
      } else {
        alert(data.error?.message || "발행에 실패했습니다.");
      }
    } catch {
      alert("발행 중 오류가 발생했습니다.");
    } finally {
      setIsPublishing(false);
    }
  }, [formData, mode, slug, router]);

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = formData.content.length;

  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      {/* 상단 헤더 */}
      <header className="border-border/40 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Link>
            <div className="bg-border h-6 w-px" />
            <div className="flex items-center gap-2">
              <div className="from-primary/20 to-primary/5 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br">
                <Sparkles className="text-primary h-4 w-4" />
              </div>
              <span className="font-semibold">
                {mode === "edit" ? "글 수정" : "새 글 작성"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <div className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                <Clock className="h-3 w-3" />
                <span>{lastSaved.toLocaleTimeString("ko-KR")}</span>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveDraft(false)}
              disabled={isSaving || isPublishing}
              className="border-border/50 bg-background/50 gap-2"
            >
              {saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : isSaving ? (
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {saveSuccess ? "저장됨" : "임시저장"}
              </span>
            </Button>

            <Button
              type="button"
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="from-primary to-primary/80 shadow-primary/25 hover:shadow-primary/30 gap-2 bg-gradient-to-r shadow-lg transition-all hover:shadow-xl"
            >
              {isPublishing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{mode === "edit" ? "수정 완료" : "발행하기"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
          {/* 메인 에디터 영역 */}
          <div className="space-y-6">
            <div className="group">
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="멋진 제목을 입력하세요..."
                className="placeholder:text-muted-foreground/40 h-auto border-0 bg-transparent px-0 text-3xl font-bold focus-visible:ring-0 md:text-4xl"
              />
              <div className="from-primary/50 via-primary/20 mt-2 h-0.5 w-full bg-gradient-to-r to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
            </div>

            <Input
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="글에 대한 간단한 설명을 입력하세요..."
              className="text-muted-foreground placeholder:text-muted-foreground/40 border-0 bg-transparent px-0 text-lg focus-visible:ring-0"
            />

            {showImageUploader && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <ImageUploader onUpload={handleImageUpload} />
              </div>
            )}

            <div className="border-border/50 bg-card/50 overflow-hidden rounded-2xl border shadow-xl shadow-black/5 backdrop-blur-sm">
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => handleChange("content", value)}
                placeholder="여기에 마크다운으로 글을 작성하세요..."
                onImageClick={() => setShowImageUploader(!showImageUploader)}
              />
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <span>{charCount.toLocaleString()} 자</span>
              <span>{wordCount.toLocaleString()} 단어</span>
              <span>약 {Math.ceil(wordCount / 200)} 분 읽기</span>
            </div>
          </div>

          {/* 사이드바 */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* 카테고리 선택 */}
            <div className="border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Folder className="text-primary h-4 w-4" />
                  카테고리
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />새 카테고리
                </Button>
              </div>

              {showNewCategory && (
                <div className="mb-3 flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="새 카테고리명"
                    className="border-border/50 bg-background/50 h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewCategory}
                    className="h-8"
                  >
                    추가
                  </Button>
                </div>
              )}

              <Select
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger className="border-border/50 bg-background/50">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 태그 입력 */}
            <div className="border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Tag className="text-primary h-4 w-4" />
                태그
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="태그 입력"
                  className="border-border/50 bg-background/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  className="border-border/50 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/10 text-primary hover:bg-primary/20 gap-1 pr-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary/20 ml-1 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 썸네일 URL */}
            <div className="border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Link2 className="text-primary h-4 w-4" />
                썸네일 URL
              </div>
              <Input
                value={formData.thumbnail}
                onChange={(e) => handleChange("thumbnail", e.target.value)}
                placeholder="https://..."
                className="border-border/50 bg-background/50"
              />
              {formData.thumbnail && (
                <div className="border-border/50 mt-3 overflow-hidden rounded-lg border">
                  <img
                    src={formData.thumbnail}
                    alt="썸네일 미리보기"
                    className="aspect-video w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowImageUploader(!showImageUploader)}
              className="border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5 w-full gap-2 border-dashed"
            >
              <ImageIcon className="h-4 w-4" />
              이미지 업로드
            </Button>

            <div className="border-border/50 from-primary/5 rounded-xl border bg-gradient-to-br to-transparent p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileText className="text-primary h-4 w-4" />
                작성 팁
              </div>
              <ul className="text-muted-foreground space-y-1.5 text-xs">
                <li>
                  • <kbd className="bg-muted rounded px-1">Ctrl+B</kbd> 굵게
                </li>
                <li>
                  • <kbd className="bg-muted rounded px-1">Ctrl+I</kbd> 기울임
                </li>
                <li>
                  • <kbd className="bg-muted rounded px-1">Ctrl+K</kbd> 링크
                </li>
                <li>
                  • <kbd className="bg-muted rounded px-1">Tab</kbd> 들여쓰기
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
