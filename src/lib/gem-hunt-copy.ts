/** Product name for the dwarf hunt mini-game. */
export const GEM_GAME_TITLE_HE = "משחק השדונים";

/** Help / onboarding — «קצת על המשחק». */
export const GEM_GAME_ABOUT_SECTION_HE = "קצת על המשחק";

export const GEM_GAME_ABOUT_BODY_HE = [
  "**משחק השדונים** הוא ציד קטן בליל פורים: ליד בתים בשכונה מסתתרת **חיה וירטואלית** — מצאו אותה **במצלמה**, לחצו עליה, והיא נכנסת ל**אוסף השדונים** האישי שלכם (תפריט ☰).",
  "אפשר לצוד רק בבתים **שהכתובת שלהם גלויה לכם** — כמו במפה: הבית שלכם, עסקים ומוסדות ציבוריים, ובתי שכנים **אחרי** שעת חשיפת הכתובות. אין כתובת — אין שדון.",
  "בכל בית מחכה **דמות אחרת**. בסך הכל **19 דמויות** מפוזרות בין הבתים — ככל שתגלו יותר, האוסף מתמלא.",
  "**בעלי בתים:** בדקו שהשדון יושב במקום טוב (מדרכה / חצר, בחוץ). לא מדויק? **פעולות** → **מיקום השדון** — ותרגלו פעם-פעמיים לפני הערב.",
] as const;

/** **Found** terminology (replaces **נאסף** / **אספתי**). */
export const GEM_FOUND_CHEER_HE = "מצאת שדון!";
export const GEM_FOUND_STATE_HE = "נמצא";
export const GEM_FOUND_I_HE = "מצאתי";
export const GEM_NOT_FOUND_I_HE = "לא מצאתי";

/** In-camera / map hint when user is close enough to tap-to-find. */
export const GEM_IN_FIND_RANGE_HE = "בטווח מציאה";

export const GEM_MAP_LEGEND_SECTION_HE = "שדונים";
export const GEM_MAP_LEGEND_OPEN_HE = "שדון למצוא";
export const GEM_MAP_TOGGLE_SHOW_HE = "הצג שדונים במפה";
export const GEM_MAP_TOGGLE_HIDE_HE = "הסתר שדונים במפה";
/** Floating map demon cam — opens hunt camera (not map ring toggle). */
export const GEM_MAP_CAM_FAB_OPEN_HE = "מצלמת שדונים";
export const GEM_MAP_CAM_FAB_CLOSE_HE = "סגירת מצלמת שדונים";

export const GEM_HOUSE_KICKER_HE = "שדון נסתר · גלו במצלמה";

export const GEM_PLACE_ACTION_HE = "מיקום השדון";
/** Plain-text fallback for gem placement hint (icons shown in {@link GemAnchorPlaceHint}). */
export const GEM_PLACE_HINT_HE =
  "מקמו את השדון בחוץ — במקום ציבורי, נגיש לכולם, לא בפנים בבניין.";
export const GEM_PLACE_MY_LOCATION_HE = "המיקום שלי";
export const GEM_PLACE_SAVE_HE = "שמירת מיקום";
export const GEM_PLACE_RESET_HE = "אפס";
export const GEM_PLACE_SAVED_HE = "מיקום השדון נשמר";
export const GEM_PLACE_RESET_DONE_HE = "המיקום אופס";
export const GEM_ACTION_FIND_HE = "מצא שדון";
/** Cluster ⋮ menu — start sequential hunt for every booth/unit at the address. */
export const GEM_CLUSTER_FIND_ALL_HE = "מצא הכל";
export const GEM_CLUSTER_FOUND_ALL_HE = "מצאתי הכל";
export const GEM_CAMPUS_TAP_SAVE_HE = "שמרו שדון";
/** Footer collect while **גלה לי** center gem is on screen (orbit on the model). */
export const GEM_TELL_ME_COLLECT_HE = "אספו את השדון";

export const GEM_RESET_TITLE_HE = "לאפס מציאת שדון?";
export const GEM_RESET_BODY_ONE_HE = "השדון יוסר מהמכשיר — אפשר לחפש מחדש.";
export const GEM_RESET_CLUSTER_TITLE_HE = "לאפס מציאת שדונים?";
export const GEM_RESET_CLUSTER_BODY_HE =
  "כל השדונים בכתובת הזו יוסרו מהמכשיר — אפשר לחפש מחדש.";

export function gemClusterSessionSummaryHe(total: number, newCount: number): string {
  if (newCount > 0) return `מצאתם ${total} שדונים — ${newCount} חדשים!`;
  if (total > 1) return `מצאתם שוב ${total} שדונים!`;
  return GEM_FOUND_CHEER_HE;
}
export const GEM_MAP_COMPLETE_TITLE_HE = "כל השדונים נמצאו!";

export const GEM_COLLECT_NEW_HE = "כל הכבוד!! מצאתם שדון חדש!";

export const GEM_FOUND_NEW_ON_SCREEN_HE = "מצאתם שדון חדש!";
export const GEM_CLUSTER_SKIP_HE = "דלג לשדון הבא";
export const GEM_CLUSTER_FINISH_HE = "סיום מציאה";

/** Footer while the gem is on screen (new sticker vs repeat — same placement, different copy). */
export function gemFoundOnScreenBannerHe(
  repeatVisit: boolean,
  petNameHe: string,
  isNewGemType: boolean,
): string {
  if (isNewGemType && !repeatVisit) return `מצאתם שדון חדש — ${petNameHe}!`;
  return `מצאת שוב את ${petNameHe}!`;
}
export const GEM_ALBUM_SLOTS_HE = "שדונים באוסף";
export const GEM_ALBUM_ALL_HE = "כל השדונים";

export const GEM_WALK_STRAIGHT_HE = "המשיכו ישר — השדון מולכם";
export const GEM_WALK_BEHIND_HE = "השדון מאחוריכם — סובבו את הגוף";
export const GEM_WALK_TURN_RIGHT_HE = "סובבו ימינה לכיוון השדון";
export const GEM_WALK_TURN_LEFT_HE = "סובבו שמאלה לכיוון השדון";
export const GEM_WALK_APPROACH_HE = "התקרבו לנקודת השדון";
/** Brief pulse when camera/AR shows the gem at the hunt stop (not tell-me). */
export const GEM_AT_STOP_DISCOVER_HE = "הגעתם לנקודה!";
export const GEM_WALK_MAPS_ARIA_HE = "הנחיות הליכה לשדון";
export const GEM_WALK_MAPS_LINK_HE = "הליכה ב-Google Maps לשדון";

export const GEM_PANEL_NEAR_GPS_HE = "ליד השדון — המתינו רגע ל-GPS";
export const gemPanelApproachHe = (m: number) => `התקרבו ל־${m} מ׳ לשדון על המדרכה`;
export const gemPanelOpenCameraHe = (m: number) => `~${m} מ׳ לשדון — פתחו מצלמה`;

export const GEM_TELL_ME_RANGE_HE = "יש להתקרב לשדון כדי להשתמש ב**גלה לי**";
export const GEM_AR_LOCATING_HE = "מאתרים את השדון (אותה נקודה כמו במפה)…";
export const GEM_BEARING_ARIA_HE = (label: string, distance?: string) =>
  `כיוון השדון: ${label}${distance ?? ""}`;

export const GEM_ORBIT_PICK_HOUSE_HE = "בחרו בית מהרשימה כדי לסובב את השדון";

export const GEM_ANCHOR_UPDATE_PUBLIC_HE = "עדכון מיקום שדון (ליד הבית)";
export const GEM_ANCHOR_RESET_ONE_HE = "איפוס מיקום שדון";
export const GEM_ANCHOR_TITLE_CALIBRATED_HE = "מיקום שדון: מותאם בטלפון";
export const GEM_ANCHOR_TITLE_AUTO_HE = "מיקום שדון: אוטומטי ליד הבית";
export const GEM_ANCHOR_SET_GPS_HE = "קבע מיקום שדון כאן (GPS)";
export const GEM_ANCHOR_RESET_ALL_HE = (n: number) => `איפוס כל מיקומי השדון בטלפון (${n})`;
