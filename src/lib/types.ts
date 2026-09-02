export const SCARE_LEVELS = ["mild", "medium", "spicy"] as const;
export type ScareLevel = (typeof SCARE_LEVELS)[number];

export const TREAT_OPTIONS = [
  "candy",
  "chocolate",
  "glutenFree",
  "vegan",
  "fruit",
  "toys",
  "drinks",
  "allergenFriendly",
] as const;
export type TreatId = (typeof TREAT_OPTIONS)[number];

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
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  notes: string;
  accessible: boolean;
  status: HouseStatus;
  soldOut: boolean;
  editCode: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
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
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  notes: string;
  accessible: boolean;
};

export type PublicHouse = Omit<House, "editCode" | "rejectionReason">;

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
