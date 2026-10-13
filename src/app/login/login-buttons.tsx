"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButtons({ next }: { next: string }) {
  async function signInWithKakao() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <button
      onClick={signInWithKakao}
      className="w-full rounded-xl bg-[#FEE500] py-3 font-semibold text-black/85 hover:brightness-95"
    >
      카카오로 시작하기
    </button>
  );
}
