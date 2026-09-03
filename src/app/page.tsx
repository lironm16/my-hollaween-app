import { NeighborhoodApp } from "@/components/neighborhood-app";
import { getCatalog } from "@/lib/store";
import type { Catalog } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadCatalogSafe(): Promise<Catalog | null> {
  try {
    return await getCatalog();
  } catch {
    return null;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const catalog = await loadCatalogSafe();
  const { focus } = await searchParams;
  return <NeighborhoodApp initialCatalog={catalog} focusId={focus ?? null} />;
}
