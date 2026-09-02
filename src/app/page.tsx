import { NeighborhoodApp } from "@/components/neighborhood-app";
import { getCatalog } from "@/lib/store";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const catalog = await getCatalog();
  const { focus } = await searchParams;
  return <NeighborhoodApp initialCatalog={catalog} focusId={focus ?? null} />;
}
