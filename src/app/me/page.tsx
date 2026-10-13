import { redirect } from "next/navigation";
import { cancelAction, signOutAction } from "@/app/actions";
import { Card, Notice, PageHeader } from "@/components/ui";
import { getCurrentUserId, getMyBookings, getMyPasses } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatKst } from "@/lib/time";

const STATUS_LABEL = { booked: "예약됨", cancelled: "취소됨", done: "완료", no_show: "노쇼" } as const;

// ⑤ 내 수강권 / 예약 내역
export default async function MyPage({ searchParams }: PageProps<"/me">) {
  if (!(await getCurrentUserId())) redirect("/login?next=/me");
  const { error, booked } = await searchParams;
  const [passes, bookings] = await Promise.all([getMyPasses(), getMyBookings()]);
  const now = new Date().toISOString();
  const upcoming = bookings.filter((b) => b.status === "booked" && b.starts_at > now);
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <>
      <PageHeader title="내 예약" />
      {typeof error === "string" && <Notice kind="error">{error}</Notice>}
      {booked && <Notice kind="success">예약이 완료되었습니다.</Notice>}

      <h2 className="mb-3 font-semibold">다가오는 레슨</h2>
      {upcoming.length === 0 && <p className="text-sm text-neutral-500">예약된 레슨이 없습니다.</p>}
      <ul className="space-y-3">
        {upcoming.map((b) => (
          <li key={b.id}>
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{formatKst(b.starts_at)}</p>
                  <p className="text-sm text-neutral-500">
                    {b.pro_name} · {b.bay_name}
                  </p>
                </div>
                <form action={cancelAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                    취소
                  </button>
                </form>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 font-semibold">보유 수강권</h2>
      {passes.length === 0 && <p className="text-sm text-neutral-500">구매한 수강권이 없습니다.</p>}
      <ul className="space-y-3">
        {passes.map((p) => (
          <li key={p.id}>
            <Card>
              <p className="font-semibold">
                {p.pro_name} · {p.package_title}
              </p>
              <p className="text-sm text-neutral-500">
                {p.remaining_count}/{p.total_count}회 남음 · {formatKst(p.expires_at)}까지
              </p>
            </Card>
          </li>
        ))}
      </ul>

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-semibold">지난/취소된 레슨</h2>
          <ul className="space-y-2 text-sm text-neutral-500">
            {past.map((b) => (
              <li key={b.id}>
                {formatKst(b.starts_at)} · {b.pro_name} · {STATUS_LABEL[b.status]}
              </li>
            ))}
          </ul>
        </>
      )}

      {isSupabaseConfigured && (
        <form action={signOutAction} className="mt-10 text-center">
          <button className="text-sm text-neutral-500 underline">로그아웃</button>
        </form>
      )}
    </>
  );
}
