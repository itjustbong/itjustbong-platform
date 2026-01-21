"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 에러 추적 서비스로 전송)
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="text-center">
        {/* 메시지 */}
        <h1 className="text-xl font-semibold md:text-2xl">
          문제가 발생했습니다
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        {/* 에러 다이제스트 (디버깅용) */}
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        {/* 버튼 */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            홈으로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
