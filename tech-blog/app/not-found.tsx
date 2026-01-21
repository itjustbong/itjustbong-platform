import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="text-center">
        {/* 404 숫자 */}
        <h1 className="text-7xl font-bold text-primary md:text-8xl">404</h1>

        {/* 메시지 */}
        <h2 className="mt-4 text-xl font-semibold md:text-2xl">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나, 이동되었거나, 삭제되었을 수
          있습니다.
        </p>

        {/* 버튼 */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            홈으로 가기
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 페이지
          </Link>
        </div>
      </div>
    </div>
  );
}
