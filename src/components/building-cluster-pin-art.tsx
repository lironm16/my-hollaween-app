import type { BuildingClusterIconKind } from "@/lib/map-pin-building-icon";
import { pinBuildingClusterIconHtml } from "@/lib/map-pin-building-icon";
import type { PublicHouse } from "@/lib/types";

function mockHouse(id: string, kind: "house" | "poi"): PublicHouse {
  return {
    id,
    kind,
    name: "mock",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "",
    description: "",
    lat: 32,
    lng: 34,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    visit: "come",
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    createdAt: "",
    updatedAt: "",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
  };
}

function mockCluster(kind: BuildingClusterIconKind): PublicHouse[] {
  if (kind === "houses") {
    return [mockHouse("h1", "house"), mockHouse("h2", "house")];
  }
  if (kind === "businesses") {
    return [mockHouse("p1", "poi"), mockHouse("p2", "poi")];
  }
  return [mockHouse("h1", "house"), mockHouse("p1", "poi")];
}

/** Map + legend cluster glyph (outline ghost / pumpkin pairs). */
export function BuildingClusterPinArt({ kind }: { kind: BuildingClusterIconKind }) {
  const html = pinBuildingClusterIconHtml(mockCluster(kind));
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
