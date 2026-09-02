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

export const HOUSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type HouseStatus = (typeof HOUSE_STATUSES)[number];

export type House = {
  id: string;
  name: string;
  address: string;
  description: string;
  lat: number;
  lng: number;
  treats: TreatId[];
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  notes: string;
  status: HouseStatus;
  soldOut: boolean;
  editCode: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
};

export type HouseInput = {
  name: string;
  address: string;
  description: string;
  lat: number;
  lng: number;
  treats: TreatId[];
  scareLevel: ScareLevel;
  openFrom: string;
  openTo: string;
  notes: string;
};

export type PublicHouse = Omit<House, "editCode" | "rejectionReason">;

export type Catalog = {
  updatedAt: string;
  neighborhood: string;
  houses: PublicHouse[];
};

export type DbFile = {
  houses: House[];
  updatedAt: string;
};
