import type { RedeemOutcome } from "@/lib/night-pass-service";

export const NIGHT_PASS_CODE_NOT_FOUND_HE =
  "קוד הכניסה לא תקף. אם אופס לאחרונה — בקשו מבעל הבית קוד חדש או קישור הזמנה.";

export const NIGHT_PASS_CODE_RESET_HE =
  "קוד הכניסה אופס. בקשו מבעל הבית את הקוד החדש או קישור הזמנה.";

export function nightPassRegisterErrorMessage(
  error: Extract<RedeemOutcome, { ok: false }>["error"] | string,
): string {
  if (error === "full") {
    return "כבר מחוברים 4 מכשירים. בעלי הבית צריכים להסיר מכשיר מהרשימה כדי לפנות מקום.";
  }
  if (error === "duplicate_identity") {
    return "מכשיר אחר כבר רשום עם פרטים אלו. הכנס שם או טלפון אחר.";
  }
  if (error === "code_reset") return NIGHT_PASS_CODE_RESET_HE;
  if (error === "invalid") return NIGHT_PASS_CODE_NOT_FOUND_HE;
  return "ההרשמה נכשלה. נסו שוב.";
}
