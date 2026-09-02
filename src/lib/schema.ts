import { z } from "zod";
import { HOUSE_THEMES, SCARE_LEVELS, STOCK_LEVELS, TREAT_OPTIONS, VISIT_STATES } from "@/lib/types";
import { parsePhotoUrl } from "@/lib/photos";

const treatStockSchema = z.partialRecord(z.enum(TREAT_OPTIONS), z.enum(STOCK_LEVELS));

const photoUrlSchema = z
  .string()
  .max(500)
  .refine((value) => parsePhotoUrl(value) !== null, "כתובת תמונה לא תקינה")
  .transform((value) => parsePhotoUrl(value) as string);

const clockField = z.preprocess(
  (value) => (typeof value === "string" ? value.slice(0, 5) : value),
  z.string().regex(/^\d{2}:\d{2}$/),
);

const optionalClockField = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return "";
    return typeof value === "string" ? value.slice(0, 5) : value;
  },
  z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
);

const hoursWindowSchema = z.object({
  from: clockField,
  to: clockField,
});

const houseFields = z.object({
  name: z.string().trim().min(2).max(80),
  theme: z.enum(HOUSE_THEMES),
  address: z.string().trim().min(3).max(120),
  arrival: z.string().trim().max(240),
  description: z.string().trim().max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12),
  treatStock: treatStockSchema,
  visit: z.enum(VISIT_STATES),
  scareLevel: z.enum(SCARE_LEVELS),
  openFrom: clockField,
  openTo: clockField,
  openHours: z.array(hoursWindowSchema).max(6).optional(),
  openFrom2: optionalClockField,
  openTo2: optionalClockField,
  notes: z.string().trim().max(240),
  accessible: z.boolean(),
});

export const houseInputSchema = houseFields.extend({
  theme: z.enum(HOUSE_THEMES).default("pumpkin"),
  arrival: z.string().trim().max(240).default(""),
  description: z.string().trim().max(500).default(""),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12).default([]),
  treatStock: treatStockSchema.default({}),
  visit: z.enum(VISIT_STATES).default("come"),
  openHours: z.array(hoursWindowSchema).max(6).optional().default([]),
  openFrom2: optionalClockField.default(""),
  openTo2: optionalClockField.default(""),
  notes: z.string().trim().max(240).default(""),
  accessible: z.boolean().default(false),
});

export const ownerPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  photoUrl: z.union([photoUrlSchema, z.literal("")]).optional(),
  editCode: z.string().min(4).max(12),
});

export const adminPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  adminFrozen: z.boolean().optional(),
  photoUrl: z.union([photoUrlSchema, z.literal("")]).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  rejectionReason: z.string().max(240).optional(),
});
