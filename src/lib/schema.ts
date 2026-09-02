import { z } from "zod";
import { HOUSE_THEMES, SCARE_LEVELS, TREAT_OPTIONS } from "@/lib/types";

const houseFields = z.object({
  name: z.string().trim().min(2).max(80),
  theme: z.enum(HOUSE_THEMES),
  address: z.string().trim().min(3).max(120),
  arrival: z.string().trim().max(240),
  description: z.string().trim().max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12),
  scareLevel: z.enum(SCARE_LEVELS),
  openFrom: z.string().regex(/^\d{2}:\d{2}$/),
  openTo: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(240),
  accessible: z.boolean(),
});

export const houseInputSchema = houseFields.extend({
  theme: z.enum(HOUSE_THEMES).default("pumpkin"),
  arrival: z.string().trim().max(240).default(""),
  description: z.string().trim().max(500).default(""),
  treats: z.array(z.enum(TREAT_OPTIONS)).max(12).default([]),
  notes: z.string().trim().max(240).default(""),
  accessible: z.boolean().default(false),
});

export const ownerPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  editCode: z.string().min(4).max(12),
});

export const adminPatchSchema = houseFields.partial().extend({
  soldOut: z.boolean().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  rejectionReason: z.string().max(240).optional(),
});
