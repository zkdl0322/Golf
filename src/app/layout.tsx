import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "골프 레슨 예약",
  description: "지점별 프로 레슨 수강권 구매와 예약",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <nav className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-emerald-600">
              ⛳ 골프레슨
            </Link>
            <Link href="/me" className="text-sm font-medium">
              내 예약
            </Link>
          </div>
        </nav>
        {!isSupabaseConfigured && (
          <p className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            데모 모드: 샘플 데이터로 동작 중 (서버 재시작 시 구매·예약 내역 초기화)
          </p>
        )}
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
