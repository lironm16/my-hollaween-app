import type { BuildingClusterIconKind } from "@/lib/map-pin-building-icon";
import { pinBuildingClusterIconHtml } from "@/lib/map-pin-building-icon";
import type { PublicHouse } from "@/lib/types";

function mockCluster(kind: BuildingClusterIconKind): PublicHouse[] {
  const base = {
    name: "mock",
    theme: "pumpkin" as const,
    address: "חרוזים 8",
    arrival: "",
    description: "",
    lat: 32,
    lng: 34,
    treats: ["candy"] as const,
    treatStock: { candy: "plenty" as const },
    scareLevel: "mild" as const,
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    visit: "come" as const,
    decorLevel: "medium" as const,
    decorated: true,
    soldOut: false,
    createdAt: "",
    updatedAt: "",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
  };
  if (kind === "houses") {
    return [
      { ...base, id: "h1", kind: "house" },
      { ...base, id: "h2", kind: "house" },
    ];
  }
  if (kind === "businesses") {
    return [
      { ...base, id: "p1", kind: "poi" },
      { ...base, id: "p2", kind: "poi" },
    ];
  }
  return [
    { ...base, id: "h1", kind: "house" },
    { ...base, id: "p1", kind: "poi" },
  ];
}

/** Map + legend cluster glyph (outline ghost / pumpkin pairs). */
export function BuildingClusterPinArt({ kind }: { kind: BuildingClusterIconKind }) {
  const html = pinBuildingClusterIconHtml(mockCluster(kind));
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
