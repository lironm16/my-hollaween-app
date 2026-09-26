import { NeighborhoodApp } from "@/components/neighborhood-app";
import { ROUTE_SHARE_QUERY } from "@/lib/route-share";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; routeShare?: string; gemHunt?: string }>;
}) {
  const params = await searchParams;
  const focus = params.focus ?? null;
  const routeShare = params[ROUTE_SHARE_QUERY] ?? params.routeShare ?? null;
  const gemHuntFromUrl = params.gemHunt === "1";
  return (
    <NeighborhoodApp
      initialCatalog={null}
      focusId={focus}
      routeShareParam={routeShare}
      gemHuntFromUrl={gemHuntFromUrl}
    />
  );
}
