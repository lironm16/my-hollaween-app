/** @deprecated Use `add.closedMessage` via i18n on the client. Kept for API responses. */
export const ADD_HOUSE_CLOSED_HE =
  "אפשרות הוספת בית הסתיימה. לעזרה פנו למנהל.";

/** @deprecated Use `add.successTitle` and related keys via i18n. */
export const ADD_HOUSE_SUCCESS_TITLE = "הבית במפה!";

/** @deprecated Use `add.successSubtitle*` via i18n. */
export function addHouseSuccessSubtitle(
  name: string,
  opts?: { registeredForEvent?: boolean },
) {
  if (opts?.registeredForEvent) {
    return `${name} על המפה, וגם נרשמתם לאירוע.`;
  }
  return `${name} על המפה.`;
}

/** @deprecated Use `add.successViewMap` via i18n. */
export const ADD_HOUSE_SUCCESS_MAP = "צפו בבית במפה";
/** @deprecated Use `add.successEdit` via i18n. */
export const ADD_HOUSE_SUCCESS_EDIT = "עריכת מלאי ופרטים";
/** @deprecated Use `add.successCodeAndDevices` via i18n. */
export const ADD_HOUSE_SUCCESS_CODE_AND_DEVICES = "קוד עריכה ומכשירים";
/** @deprecated Use `add.successShareCode` via i18n. */
export const ADD_HOUSE_SUCCESS_SHARE_CODE = "קוד עריכה למשפחה";
