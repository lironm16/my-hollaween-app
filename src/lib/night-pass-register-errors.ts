import type { RedeemOutcome } from "@/lib/night-pass-service";

export function nightPassRegisterErrorMessage(
  error: Extract<RedeemOutcome, { ok: false }>["error"] | string,
): string {
  if (error === "full") {
    return "כבר מחוברים 4 מכשירים. בעלי הבית צריכים להסיר מכשיר מהרשימה כדי לפנות מקום.";
  }
  if (error === "duplicate_identity") {
    return "מכשיר אחר כבר רשום עם פרטים אלו. הכנס שם או טלפון אחר.";
  }
  return "ההרשמה נכשלה. נסו שוב.";
}
