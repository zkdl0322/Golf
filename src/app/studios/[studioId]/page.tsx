import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getPros, getStudio } from "@/lib/data";

// ② 지점 소속 프로 명단
export default async function StudioPage({ params }: PageProps<"/studios/[studioId]">) {
  const { studioId } = await params;
  const studio = await getStudio(studioId);
  if (!studio) notFound();
  const pros = await getPros(studioId);

  return (
    <>
      <PageHeader title={studio.name} subtitle="소속 프로" back="/" />
      {pros.length === 0 && <p className="text-neutral-500">등록된 프로가 없습니다.</p>}
      <ul className="space-y-3">
        {pros.map((pro) => (
          <li key={pro.id}>
            <Card href={`/pros/${pro.id}`}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                  {pro.name.slice(0, 1)}
                </div>
                <div>
                  <p className="font-semibold">{pro.name}</p>
                  {pro.bio && <p className="text-sm text-neutral-500">{pro.bio}</p>}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
