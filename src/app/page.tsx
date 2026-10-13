import { Card, PageHeader } from "@/components/ui";
import { getStudios } from "@/lib/data";

// ① 지점 목록
export default async function Home() {
  const studios = await getStudios();

  return (
    <>
      <PageHeader title="지점 선택" subtitle="레슨 받을 지점을 선택하세요" />
      <ul className="space-y-3">
        {studios.map((studio) => (
          <li key={studio.id}>
            <Card href={`/studios/${studio.id}`}>
              <p className="font-semibold">{studio.name}</p>
              {studio.address && <p className="text-sm text-neutral-500">{studio.address}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
