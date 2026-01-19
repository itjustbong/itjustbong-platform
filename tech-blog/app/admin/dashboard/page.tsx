import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function AdminDashboardPage() {
  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/admin");
  }

  return (
    <div className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          대시보드 기능은 다음 작업에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}
