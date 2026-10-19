/** Shown when the public add-house window has closed. */
export const ADD_HOUSE_CLOSED_HE =
  "אפשרות הוספת בית הסתיימה. לעזרה פנו למנהל.";

/** Add-house success — celebration + next steps only; code/devices live in a dialog. */
export const ADD_HOUSE_SUCCESS_TITLE = "הבית במפה!";

export function addHouseSuccessSubtitle(
  name: string,
  opts?: { registeredForEvent?: boolean },
) {
  if (opts?.registeredForEvent) {
    return `${name} על המפה, וגם נרשמתם לאירוע.`;
  }
  return `${name} על המפה.`;
}

export const ADD_HOUSE_SUCCESS_MAP = "צפו בבית במפה";
export const ADD_HOUSE_SUCCESS_EDIT = "עריכת מלאי ופרטים";

/** Opens the same dialog as ⋮ → קוד עריכה ומכשירים (when night passes are on). */
export const ADD_HOUSE_SUCCESS_CODE_AND_DEVICES = "קוד עריכה ומכשירים";

/** Night passes off — dialog shows edit code only. */
export const ADD_HOUSE_SUCCESS_SHARE_CODE = "קוד עריכה למשפחה";
