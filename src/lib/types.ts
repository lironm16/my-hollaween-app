export const SCARE_LEVELS = ["mild", "medium", "spicy"] as const;
export type ScareLevel = (typeof SCARE_LEVELS)[number];

export const DECOR_LEVELS = ["none", "mild", "medium", "heavy"] as const;
export type DecorLevel = (typeof DECOR_LEVELS)[number];

export const SENSITIVITY_OPTIONS = ["glutenFree", "nutsFree", "sesameFree"] as const;
export type SensitivityId = (typeof SENSITIVITY_OPTIONS)[number];

/** Candy plus optional sensitivity flags — no per-item stock beyond candy. */
export const TREAT_OPTIONS = ["candy", ...SENSITIVITY_OPTIONS] as const;
export type TreatId = (typeof TREAT_OPTIONS)[number];

/** Legacy treat ids stripped on load (older seed / catalog records). */
export const LEGACY_TREAT_IDS = [
  "chocolate",
  "vegan",
  "fruit",
  "toys",
  "drinks",
  "allergenFriendly",
] as const;

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

/** Candy disc tones on the map / list / filters (stock plus "never offered"). */
export const CANDY_TONE_IDS = ["none", "plenty", "low", "out"] as const;
export type CandyTone = (typeof CANDY_TONE_IDS)[number];

export const VISIT_STATES = ["come", "decorOnly", "closed"] as const;
export type VisitState = (typeof VISIT_STATES)[number];

export type TreatStock = {
  candy?: StockLevel;
};

export type HoursWindow = { from: string; to: string };

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
  /** All open windows for the evening (preferred). */
  openHours?: HoursWindow[];
  /** @deprecated Prefer openHours; kept for older records. */
  openFrom2?: string;
  openTo2?: string;
  notes: string;
  accessible: boolean;
  /** Four-level outdoor decoration. `decorated` is kept in sync for older records. */
  decorLevel?: DecorLevel;
  decorated?: boolean;
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
  openHours?: HoursWindow[];
  openFrom2?: string;
  openTo2?: string;
  notes: string;
  accessible: boolean;
  decorLevel?: DecorLevel;
  decorated?: boolean;
};

export type NightPatch = {
  visit?: VisitState;
  scareLevel?: ScareLevel;
  decorLevel?: DecorLevel;
  decorated?: boolean;
  treatStock?: TreatStock;
  treats?: TreatId[];
  ownerFrozenUntil?: string | null;
  adminFrozen?: boolean;
  soldOut?: boolean;
  photoUrl?: string;
};

export type PublicHouse = Omit<House, "editCode" | "rejectionReason" | "storeId">;

export type CatalogPushTemplate = {
  enabled: boolean;
  title: string;
  body: string;
};

export type Catalog = {
  updatedAt: string;
  neighborhood: string;
  houses: PublicHouse[];
  /** Merged owner-alert templates so quick-update preview matches the server. */
  pushTemplates?: Partial<Record<string, CatalogPushTemplate>>;
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

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
  /** Topics this device wants. Missing means all (older subscriptions). */
  topics?: Array<"newHouse" | "houseStatus" | "admin">;
};

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export type DbFile = {
  houses: House[];
  updatedAt: string;
  pushSubscriptions?: PushSubscriptionRecord[];
  vapid?: VapidKeys;
  pushSettings?: {
    updatedAt?: string;
    templates?: Partial<
      Record<
        | "onBreak"
        | "backFromBreak"
        | "houseAdded"
        | "closed"
        | "decorOnly"
        | "candyLow"
        | "candyOut"
        | "candyOutClosed"
        | "candyRestock"
        | "backActive",
        { enabled: boolean; title: string; body: string }
      >
    >;
  };
};
