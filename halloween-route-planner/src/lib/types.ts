export type CandyLevel = "green" | "yellow" | "red";

export type HouseStatus = "active" | "paused" | "suspended";

export type AccessibilityTag =
  | "wheelchair"
  | "stroller"
  | "visual"
  | "hearing"
  | "low-sensory";

export type DietaryTag =
  | "gluten-free"
  | "nut-free"
  | "vegan"
  | "kosher"
  | "sugar-free";

export type ScareLevel = "low" | "medium" | "high";

export type EmergencyType =
  | "safety"
  | "crowd"
  | "medical"
  | "behavior"
  | "other";

export type HouseHoursSlot = {
  day: number;
  start: string;
  end: string;
};

export type House = {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: HouseStatus;
  scareLevel: ScareLevel;
  accessibility: AccessibilityTag[];
  dietary: DietaryTag[];
  candyLevel: CandyLevel;
  defaultImage: boolean;
  imageUrl?: string;
  hours: HouseHoursSlot[];
  contactInstructions?: string;
  allowKnock: boolean;
  routeNotes?: string;
  decorationVotes: number;
  checkIns: number;
  lastUpdated: string;
};

export type RouteFilters = {
  radiusKm?: number;
  scareLevels: ScareLevel[];
  accessibility: AccessibilityTag[];
  dietary: DietaryTag[];
  candyLevels: CandyLevel[];
  openNow: boolean;
  onlyFavorites: boolean;
};

export type RouteStop = {
  houseId: string;
  plannedArrival?: string;
};

export type RoutePlan = {
  id: string;
  name: string;
  filters: RouteFilters;
  stops: RouteStop[];
  isOfflineReady: boolean;
};

export type EmergencyReport = {
  id: string;
  houseId: string;
  reporterId: string;
  type: EmergencyType;
  details: string;
  status: "new" | "acknowledged" | "resolved";
  reportedAt: string;
  resolvedAt?: string;
};
