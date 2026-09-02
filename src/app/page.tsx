import { NeighborhoodApp } from "@/components/neighborhood-app";
import { getCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const catalog = await getCatalog();
  const { focus } = await searchParams;
  return <NeighborhoodApp initialCatalog={catalog} focusId={focus ?? null} />;
}
