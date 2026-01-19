import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  // 이미 인증된 경우 대시보드로 리다이렉트
  const authenticated = await isAuthenticated();
  if (authenticated) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
