"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButtons({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const redirectTo = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithKakao() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: redirectTo() } });
  }

  // 이메일로 로그인 링크 전송 (비밀번호 없이 링크 클릭으로 로그인)
  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={signInWithEmail} className="space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          disabled={status === "sending"}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:bg-neutral-400"
        >
          {status === "sending" ? "보내는 중…" : "이메일로 로그인 링크 받기"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {email} 으로 로그인 링크를 보냈어요. 메일함에서 링크를 눌러주세요.
          </p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{message}</p>}
      </form>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        또는
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <button
        onClick={signInWithKakao}
        className="w-full rounded-xl bg-[#FEE500] py-3 font-semibold text-black/85 hover:brightness-95"
      >
        카카오로 시작하기
      </button>
    </div>
  );
}
