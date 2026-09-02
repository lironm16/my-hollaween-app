export const SCARE_LEVELS = ["mild", "medium", "spicy"] as const;
export type ScareLevel = (typeof SCARE_LEVELS)[number];

export const TREAT_OPTIONS = [
  "candy",
  "chocolate",
  "glutenFree",
  "nutsFree",
  "sesameFree",
  "vegan",
  "fruit",
  "toys",
  "drinks",
  "allergenFriendly",
] as const;
export type TreatId = (typeof TREAT_OPTIONS)[number];

export const SENSITIVITY_OPTIONS = ["glutenFree", "nutsFree", "sesameFree"] as const;
export type SensitivityId = (typeof SENSITIVITY_OPTIONS)[number];

export const HOUSE_THEMES = [
  "ghost",
  "witch",
  "pumpkin",
  "vampire",
  "skeleton",
  "monster",
  "haunted",
  "candy",
  "spider",
  "blackCat",
] as const;
export type HouseTheme = (typeof HOUSE_THEMES)[number];

export const HOUSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type HouseStatus = (typeof HOUSE_STATUSES)[number];

export const STOCK_LEVELS = ["plenty", "low", "out"] as const;
export type StockLevel = (typeof STOCK_LEVELS)[number];

export const VISIT_STATES = ["come", "decorOnly", "closed"] as const;
export type VisitState = (typeof VISIT_STATES)[number];

export type TreatStock = Partial<Record<TreatId, StockLevel>>;

export type House = {
  id: string;
  name: string;
  theme: HouseTheme;
  address: string;
  arrival: string;
  description: string;
  lat: number;
  lng: number;
  treats: TreatId[];
  treatStock: TreatStock;
  visit: VisitState;
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  /** Optional second open window (e.g. 17–18 and 20–21). */
  openFrom2?: string;
  openTo2?: string;
  notes: string;
  accessible: boolean;
  status: HouseStatus;
  soldOut: boolean;
  adminFrozen: boolean;
  ownerFrozenUntil: string | null;
  photoUrl: string;
  editCode: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  /** Remote document id; never sent to the public catalog. */
  storeId?: string;
};

export type HouseInput = {
  name: string;
  theme: HouseTheme;
  address: string;
  arrival: string;
  description: string;
  lat: number;
  lng: number;
  treats: TreatId[];
  treatStock?: TreatStock;
  visit?: VisitState;
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  openFrom2?: string;
  openTo2?: string;
  notes: string;
  accessible: boolean;
};

export type NightPatch = {
  visit?: VisitState;
  treatStock?: TreatStock;
  treats?: TreatId[];
  ownerFrozenUntil?: string | null;
  adminFrozen?: boolean;
  soldOut?: boolean;
  photoUrl?: string;
};

export type PublicHouse = Omit<House, "editCode" | "rejectionReason" | "storeId">;

export type Catalog = {
  updatedAt: string;
  neighborhood: string;
  houses: PublicHouse[];
};

export type AddressHit = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  road: string;
  houseNumber?: string;
  suburb?: string;
  city: string;
  precise: boolean;
};

export type DbFile = {
  houses: House[];
  updatedAt: string;
};
