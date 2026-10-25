/** Same as {@link HOUSE_ACCESS_CODE_LENGTH} in house-access-code — safe for client UI. */
export const HOUSE_ACCESS_CODE_LENGTH = 6;

export const NIGHT_PASS_REGISTER_SUBTITLE =
  "קיבלתם קוד כניסה? הירשמו כדי לראות כתובות בתים ביום החשיפה";

export const NIGHT_PASS_OWNER_REGISTER_SUBTITLE =
  "בעלי בית — בדקו את הפרטים ולחצו אישור כדי לחבר את המכשיר לאירוע. לא צריך קוד כניסה.";

export const NIGHT_PASS_OWNER_COEDITOR_HINT =
  "עורך עם קוד עריכה? הזינו את השם והנייד שלכם, או השתמשו בקישור הזמנה מבעלי הבית.";

/** Map banner / register entry — distinct from קוד עריכה. */
export const NIGHT_PASS_BANNER_CTA = "יש לי קוד כניסה";

/** Owner unlocked a house on this device — no entrance code needed. */
export const NIGHT_PASS_OWNER_BANNER_CTA = "חיבור לאירוע (בעלי בית)";

/** No clock/date — private homes unlock on reveal day. */
export const NIGHT_PASS_REVEAL_HINT = "כתובות בתים יוצגו ביום החשיפה.";

export const NIGHT_PASS_ALREADY_REGISTERED_TITLE = "כבר נרשמתם!";
export const NIGHT_PASS_ALREADY_REGISTERED_BODY =
  "המכשיר הזה כבר מחובר לאירוע. אין צורך להירשם שוב מהזמנה.";

/** First-time event registration on this device (add house or owner login). */
export const NIGHT_PASS_EVENT_REGISTERED_TITLE = "נרשמתם לאירוע!";

export const HOUSE_ACCESS_ROLE_OWNER_LABEL = "בעל בית";
export const HOUSE_ACCESS_ROLE_EDITOR_LABEL = "עורך";
export const HOUSE_ACCESS_ROLE_FIELD_LABEL = "תפקיד";

export type HouseAccessRegistrationKind = "owner" | "editor";

export function houseAccessRoleLabel(role: "owner" | "editor") {
  return role === "owner" ? HOUSE_ACCESS_ROLE_OWNER_LABEL : HOUSE_ACCESS_ROLE_EDITOR_LABEL;
}

/** Link text when an owner may change another device's role. */
export function houseAccessRoleChangePrompt(role: "owner" | "editor") {
  return role === "owner" ? "הפוך לעורך" : "הפוך לבעל בית";
}

export function nightPassEventRegisteredBody(
  houseName: string,
  kind: HouseAccessRegistrationKind = "owner",
) {
  const label = houseName.trim() || "הבית";
  if (kind === "editor") {
    return `נרשמתם כעורך של ${label}. כתובות בתים יוצגו ביום החשיפה במכשיר הזה.`;
  }
  return `אתם בעלי הבית של ${label} ויכולים לערוך אותו מהטלפון הזה.`;
}

export const NIGHT_PASS_EVENT_REGISTERED_CONTINUE = "המשך למפה";
