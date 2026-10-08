import { z } from "zod";
import { isValidOwnerPhone, normalizeOwnerPhone } from "@/lib/owner-phone";

export const HELP_REQUEST_ROLES = ["owner", "visitor"] as const;
export type HelpRequestRole = (typeof HELP_REQUEST_ROLES)[number];

export const HELP_REQUEST_PLATFORMS = ["android", "iphone", "other"] as const;
export type HelpRequestPlatform = (typeof HELP_REQUEST_PLATFORMS)[number];

export const HELP_REQUEST_TOPICS = [
  "bug",
  "add_house",
  "map_route",
  "install",
  "edit_code",
  "other",
] as const;
export type HelpRequestTopic = (typeof HELP_REQUEST_TOPICS)[number];

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(24)
  .refine((v) => !v || isValidOwnerPhone(v), "מספר טלפון לא תקין")
  .transform((v) => (v ? normalizeOwnerPhone(v) : ""));

const contextSchema = z
  .object({
    appVersion: z.string().max(32).optional(),
    path: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
    online: z.boolean().optional(),
    standalone: z.boolean().optional(),
    userAgent: z.string().max(500).optional(),
    language: z.string().max(32).optional(),
    viewport: z.string().max(32).optional(),
    timezone: z.string().max(64).optional(),
    detectedPlatform: z.enum(["android", "iphone", "other"]).optional(),
    neighborhoodLabel: z.string().max(120).optional(),
  })
  .passthrough();

export const helpRequestSubmitSchema = z.object({
  name: z.string().trim().min(2, "נא למלא שם.").max(80),
  phone: optionalPhoneSchema.optional(),
  role: z.enum(HELP_REQUEST_ROLES),
  platform: z.enum(HELP_REQUEST_PLATFORMS),
  topic: z.enum(HELP_REQUEST_TOPICS).optional(),
  message: z.string().trim().min(10, "ספרו בקצרה מה קרה (לפחות 10 תווים).").max(2000),
  houseHint: z.string().trim().max(120).optional(),
  /** Honeypot — must stay empty. */
  company: z.string().max(0).optional(),
  context: contextSchema.optional(),
});

export type HelpRequestSubmitInput = z.infer<typeof helpRequestSubmitSchema>;

export type StoredHelpRequest = HelpRequestSubmitInput & {
  id: string;
  createdAt: string;
  phone: string;
};

export const HELP_REQUEST_TOPIC_LABELS: Record<HelpRequestTopic, string> = {
  bug: "תקלה / באג",
  add_house: "הוספת בית",
  map_route: "מפה / מסלול",
  install: "התקנה על המסך",
  edit_code: "קוד עריכה",
  other: "משהו אחר",
};

export const HELP_REQUEST_ROLE_LABELS: Record<HelpRequestRole, string> = {
  owner: "בעל/ת בית",
  visitor: "מבקר/ת",
};

export const HELP_REQUEST_PLATFORM_LABELS: Record<HelpRequestPlatform, string> = {
  android: "אנדרואיד",
  iphone: "אייפון",
  other: "אחר / לא בטוח/ה",
};
