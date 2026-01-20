"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  CloudUpload,
  Clipboard,
} from "lucide-react";

interface ImageUploaderProps {
  onUpload: (imageUrl: string, markdownSyntax: string) => void;
  className?: string;
  /** 전역 클립보드 이벤트 리스너 활성화 여부 */
  enableGlobalPaste?: boolean;
}

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message?: string;
  fileName?: string;
}

export function ImageUploader({
  onUpload,
  className,
  enableGlobalPaste = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const uploadImage = useCallback(
    async (file: File) => {
      // 이미 업로드 중이면 무시
      if (uploadState.status === "uploading") {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setUploadState({
          status: "error",
          progress: 0,
          message: "이미지 파일만 업로드할 수 있습니다.",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadState({
          status: "error",
          progress: 0,
          message: "파일 크기는 10MB 이하여야 합니다.",
        });
        return;
      }

      setUploadState({
        status: "uploading",
        progress: 10,
        fileName: file.name,
      });

      try {
        const urlResponse = await fetch("/api/upload", { method: "POST" });

        if (!urlResponse.ok) {
          throw new Error("업로드 URL 발급에 실패했습니다.");
        }

        const urlData = await urlResponse.json();
        if (!urlData.success) {
          throw new Error(urlData.error?.message || "업로드 URL 발급 실패");
        }

        setUploadState({ status: "uploading", progress: 30 });

        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(urlData.uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드에 실패했습니다.");
        }

        setUploadState({ status: "uploading", progress: 90 });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          throw new Error("이미지 업로드 처리 실패");
        }

        const imageUrl = urlData.imageUrl;
        const altText = file.name.replace(/\.[^/.]+$/, "");
        const markdownSyntax = `![${altText}](${imageUrl})`;

        setUploadState({
          status: "success",
          progress: 100,
          message: "업로드 완료!",
        });

        onUpload(imageUrl, markdownSyntax);

        setTimeout(() => {
          setUploadState({ status: "idle", progress: 0 });
        }, 2000);
      } catch (error) {
        console.error("이미지 업로드 오류:", error);
        setUploadState({
          status: "error",
          progress: 0,
          message:
            error instanceof Error
              ? error.message
              : "업로드 중 오류가 발생했습니다.",
        });
      }
    },
    [onUpload, uploadState.status]
  );

  // 전역 클립보드 이벤트 리스너
  useEffect(() => {
    if (!enableGlobalPaste) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            uploadImage(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, [enableGlobalPaste, uploadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadImage(files[0]);
      }
    },
    [uploadImage]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            uploadImage(file);
            break;
          }
        }
      }
    },
    [uploadImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadImage(files[0]);
      }
      e.target.value = "";
    },
    [uploadImage]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
        uploadState.status === "error" && "border-destructive bg-destructive/5",
        uploadState.status === "success" && "border-green-500 bg-green-500/5",
        uploadState.status === "uploading" && "border-primary bg-primary/5",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative flex flex-col items-center justify-center gap-4 p-8">
        {uploadState.status === "idle" && (
          <>
            <div className="relative">
              <div className="from-primary/20 to-primary/5 shadow-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
                <CloudUpload className="text-primary h-8 w-8" />
              </div>
              <div className="bg-background absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md">
                <ImageIcon className="text-muted-foreground h-3 w-3" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                PNG, JPG, GIF, WebP (최대 10MB)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shadow-primary/20 gap-2 shadow-lg"
              >
                <Upload className="h-4 w-4" />
                파일 선택
              </Button>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Clipboard className="h-3 w-3" />
                <span>Ctrl+V 붙여넣기</span>
              </div>
            </div>
          </>
        )}

        {uploadState.status === "uploading" && (
          <>
            <div className="relative">
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
              {/* 원형 프로그레스 */}
              <svg className="absolute inset-0 h-16 w-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary/20"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${uploadState.progress * 1.76} 176`}
                  className="text-primary transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">
                업로드 중...
              </p>
              {uploadState.fileName && (
                <p className="text-muted-foreground mt-1 max-w-[200px] truncate text-xs">
                  {uploadState.fileName}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="bg-muted h-1.5 w-32 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {uploadState.progress}%
                </span>
              </div>
            </div>
          </>
        )}

        {uploadState.status === "success" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {uploadState.message}
            </p>
          </>
        )}

        {uploadState.status === "error" && (
          <>
            <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-2xl">
              <X className="text-destructive h-8 w-8" />
            </div>
            <p className="text-destructive text-sm font-medium">
              {uploadState.message}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadState({ status: "idle", progress: 0 })}
            >
              다시 시도
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
