import { z } from "zod";
import {
  DECOR_LEVELS,
  HOUSE_THEMES,
  SCARE_LEVELS,
  STOCK_LEVELS,
  TREAT_OPTIONS,
  VISIT_STATES,
} from "@/lib/types";
import { hoursWindowsOverlap, isValidHoursWindow } from "@/lib/hours";
import { parsePhotoUrl } from "@/lib/photos";

/** Shared text limits for house forms and API validation. */
export const HOUSE_FIELD_LIMITS = {
  name: { min: 2, max: 80 },
  address: { min: 3, max: 120 },
  arrival: { max: 240 },
  description: { max: 500 },
  notes: { max: 240 },
  addedBy: { min: 2, max: 80 },
  editCode: { min: 4, max: 12 },
} as const;

const treatStockSchema = z.object({ candy: z.enum(STOCK_LEVELS).optional() });

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

const hoursWindowSchema = z
  .object({
    from: clockField,
    to: clockField,
  })
  .refine((window) => isValidHoursWindow({ from: String(window.from), to: String(window.to) }), {
    message: "שעת הסגירה חייבת להיות אחרי שעת הפתיחה",
  });

const hoursWindowsSchema = z
  .array(hoursWindowSchema)
  .max(6)
  .refine(
    (windows) =>
      !hoursWindowsOverlap(
        windows.map((window) => ({ from: String(window.from), to: String(window.to) })),
      ),
    { message: "חלונות השעות חופפים" },
  );

const houseFields = z.object({
  name: z.string().trim().min(HOUSE_FIELD_LIMITS.name.min).max(HOUSE_FIELD_LIMITS.name.max),
  theme: z.enum(HOUSE_THEMES),
  address: z
    .string()
    .trim()
    .min(HOUSE_FIELD_LIMITS.address.min)
    .max(HOUSE_FIELD_LIMITS.address.max),
  arrival: z.string().trim().max(HOUSE_FIELD_LIMITS.arrival.max),
  description: z.string().trim().max(HOUSE_FIELD_LIMITS.description.max),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12),
  treatStock: treatStockSchema,
  visit: z.enum(VISIT_STATES),
  scareLevel: z.enum(SCARE_LEVELS),
  openFrom: clockField,
  openTo: clockField,
  openHours: hoursWindowsSchema.optional(),
  openFrom2: optionalClockField,
  openTo2: optionalClockField,
  notes: z.string().trim().max(HOUSE_FIELD_LIMITS.notes.max),
  accessible: z.boolean(),
  decorLevel: z.enum(DECOR_LEVELS).optional(),
  decorated: z.boolean().optional(),
});

export const houseSubmitSchema = houseFields.extend({
  addedBy: z
    .string()
    .trim()
    .min(HOUSE_FIELD_LIMITS.addedBy.min)
    .max(HOUSE_FIELD_LIMITS.addedBy.max),
});

export const houseInputSchema = houseFields.extend({
  theme: z.enum(HOUSE_THEMES).default("pumpkin"),
  arrival: z.string().trim().max(HOUSE_FIELD_LIMITS.arrival.max).default(""),
  description: z.string().trim().max(HOUSE_FIELD_LIMITS.description.max).default(""),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12).default([]),
  treatStock: treatStockSchema.default({}),
  visit: z.enum(VISIT_STATES).default("come"),
  openHours: hoursWindowsSchema.optional().default([]),
  openFrom2: optionalClockField.default(""),
  openTo2: optionalClockField.default(""),
  notes: z.string().trim().max(HOUSE_FIELD_LIMITS.notes.max).default(""),
  accessible: z.boolean().default(false),
  decorLevel: z.enum(DECOR_LEVELS).optional(),
  decorated: z.boolean().optional(),
});

const addedByPatchField = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z
    .union([
      z.string().trim().min(HOUSE_FIELD_LIMITS.addedBy.min).max(HOUSE_FIELD_LIMITS.addedBy.max),
      z.null(),
    ])
    .optional(),
);

export const ownerPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  photoUrl: z.union([photoUrlSchema, z.literal("")]).optional(),
  editCode: z
    .string()
    .min(HOUSE_FIELD_LIMITS.editCode.min)
    .max(HOUSE_FIELD_LIMITS.editCode.max)
    .optional(),
  addedBy: addedByPatchField,
});

export const adminPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  adminFrozen: z.boolean().optional(),
  photoUrl: z.union([photoUrlSchema, z.literal("")]).optional(),
  addedBy: addedByPatchField,
});
