import Link from "next/link";
import { notFound } from "next/navigation";
import { purchaseAction } from "@/app/actions";
import { buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { won } from "@/lib/format";
import { getMyPasses, getPackages, getPro } from "@/lib/data";

// ③ 프로 상세 + 레슨 상품 구매
export default async function ProPage({ params, searchParams }: PageProps<"/pros/[proId]">) {
  const { proId } = await params;
  const { error } = await searchParams;
  const pro = await getPro(proId);
  if (!pro) notFound();
  const [packages, passes] = await Promise.all([getPackages(proId), getMyPasses(proId)]);
  const usablePasses = passes.filter((p) => p.remaining_count > 0);

  return (
    <>
      <PageHeader title={pro.name} subtitle={pro.bio ?? undefined} back={`/studios/${pro.studio_id}`} />
      {typeof error === "string" && <Notice kind="error">{error}</Notice>}

      {usablePasses.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm">
              보유 수강권 <b>{usablePasses.reduce((n, p) => n + p.remaining_count, 0)}회</b> 남음
            </p>
            <Link href={`/pros/${pro.id}/book`} className={buttonClass}>
              예약하기
            </Link>
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-6 font-semibold">레슨 상품</h2>
      <ul className="space-y-3">
        {packages.map((pkg) => (
          <li key={pkg.id}>
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{pkg.title}</p>
                  {pkg.description && <p className="text-sm text-neutral-500">{pkg.description}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
                    {pkg.lesson_count}회 · 회당 {pkg.lesson_minutes}분
                  </p>
                  <p className="mt-2 font-bold">{won(pkg.price)}</p>
                </div>
                <form action={purchaseAction}>
                  <input type="hidden" name="packageId" value={pkg.id} />
                  <input type="hidden" name="proId" value={pro.id} />
                  <button className={buttonClass}>구매</button>
                </form>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
