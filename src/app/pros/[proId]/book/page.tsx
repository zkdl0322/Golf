import Link from "next/link";
import { notFound } from "next/navigation";
import { bookAction } from "@/app/actions";
import { buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/time";
import { getAvailableSlots, getMyPasses, getPro } from "@/lib/data";

// ④ 예약 가능 시간 선택 + 예약
export default async function BookPage({ params, searchParams }: PageProps<"/pros/[proId]/book">) {
  const { proId } = await params;
  const { error, purchased } = await searchParams;
  const pro = await getPro(proId);
  if (!pro) notFound();

  const [days, passes] = await Promise.all([getAvailableSlots(pro), getMyPasses(proId)]);
  const usablePasses = passes.filter((p) => p.remaining_count > 0);

  return (
    <>
      <PageHeader title={`${pro.name} 레슨 예약`} back={`/pros/${pro.id}`} />
      {typeof error === "string" && <Notice kind="error">{error}</Notice>}
      {purchased && <Notice kind="success">수강권 구매가 완료되었습니다. 레슨 시간을 선택하세요.</Notice>}

      {usablePasses.length === 0 ? (
        <Card>
          <p className="text-sm">사용 가능한 수강권이 없습니다.</p>
          <Link href={`/pros/${pro.id}`} className={`${buttonClass} mt-3 inline-block`}>
            수강권 구매하러 가기
          </Link>
        </Card>
      ) : (
        <form action={bookAction} className="space-y-6">
          <input type="hidden" name="proId" value={pro.id} />

          <fieldset>
            <legend className="mb-2 font-semibold">수강권</legend>
            <div className="space-y-2">
              {usablePasses.map((pass, i) => (
                <label key={pass.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                  <input type="radio" name="passId" value={pass.id} defaultChecked={i === 0} required />
                  <span>
                    {pass.package_title} · <b>{pass.remaining_count}</b>/{pass.total_count}회 남음
                    <span className="ml-2 text-xs text-neutral-400">~{formatKst(pass.expires_at)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-semibold">시간 선택</legend>
            {days.length === 0 && <p className="text-sm text-neutral-500">예약 가능한 시간이 없습니다.</p>}
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.date}>
                  <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">{day.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {day.slots.map((slot) => (
                      <label key={slot.startsAt}>
                        <input
                          type="radio"
                          name="startsAt"
                          value={slot.startsAt}
                          disabled={!slot.available}
                          required
                          className="peer sr-only"
                        />
                        <span className="block cursor-pointer rounded-lg border border-neutral-200 py-2 text-center text-sm peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-disabled:cursor-not-allowed peer-disabled:bg-neutral-100 peer-disabled:text-neutral-300 peer-disabled:line-through dark:border-neutral-800 dark:peer-disabled:bg-neutral-900 dark:peer-disabled:text-neutral-600">
                          {slot.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="sticky bottom-0 bg-neutral-50 py-3 dark:bg-neutral-950">
            <button className={`${buttonClass} w-full py-3`}>예약하기 (수강권 1회 차감)</button>
          </div>
        </form>
      )}
    </>
  );
}
