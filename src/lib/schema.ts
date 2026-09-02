import { z } from "zod";
import { HOUSE_THEMES, SCARE_LEVELS, STOCK_LEVELS, TREAT_OPTIONS, VISIT_STATES } from "@/lib/types";
import { parsePhotoUrl } from "@/lib/photos";

const treatStockSchema = z.partialRecord(z.enum(TREAT_OPTIONS), z.enum(STOCK_LEVELS));

const photoUrlSchema = z
  .string()
  .max(500)
  .refine((value) => parsePhotoUrl(value) !== null, "כתובת תמונה לא תקינה")
  .transform((value) => parsePhotoUrl(value) as string);

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
  openFrom: z.preprocess(
    (value) => (typeof value === "string" ? value.slice(0, 5) : value),
    z.string().regex(/^\d{2}:\d{2}$/),
  ),
  openTo: z.preprocess(
    (value) => (typeof value === "string" ? value.slice(0, 5) : value),
    z.string().regex(/^\d{2}:\d{2}$/),
  ),
  openFrom2: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return "";
      return typeof value === "string" ? value.slice(0, 5) : value;
    },
    z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
  ),
  openTo2: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return "";
      return typeof value === "string" ? value.slice(0, 5) : value;
    },
    z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
  ),
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
  openFrom2: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return "";
      return typeof value === "string" ? value.slice(0, 5) : value;
    },
    z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
  ).default(""),
  openTo2: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return "";
      return typeof value === "string" ? value.slice(0, 5) : value;
    },
    z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
  ).default(""),
  notes: z.string().trim().max(240).default(""),
  accessible: z.boolean().default(false),
});

export const ownerPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  photoUrl: photoUrlSchema.optional(),
  editCode: z.string().min(4).max(12),
});

export const adminPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  adminFrozen: z.boolean().optional(),
  photoUrl: photoUrlSchema.optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  rejectionReason: z.string().max(240).optional(),
});
