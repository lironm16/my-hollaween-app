import { NeighborhoodApp } from "@/components/neighborhood-app";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  return <NeighborhoodApp initialCatalog={null} focusId={focus ?? null} />;
}
