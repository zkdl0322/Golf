import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginButtons } from "./login-buttons";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/";
  if (!isSupabaseConfigured) redirect(nextPath); // 데모 모드는 로그인 없이 사용

  return (
    <>
      <PageHeader title="로그인" subtitle="수강권 구매와 예약을 위해 로그인해 주세요" />
      <LoginButtons next={nextPath} />
    </>
  );
}
