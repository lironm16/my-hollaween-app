/** Product name for the dwarf hunt mini-game. */
export const GEM_GAME_TITLE_HE = "משחק השדונים";

/** «Found» terminology (replaces «נאסף» / «אספתי»). */
export const GEM_FOUND_CHEER_HE = "מצאת שדון!";
export const GEM_FOUND_STATE_HE = "נמצא";
export const GEM_FOUND_I_HE = "מצאתי";
export const GEM_NOT_FOUND_I_HE = "לא מצאתי";

/** In-camera / map hint when user is close enough to tap-to-find. */
export const GEM_IN_FIND_RANGE_HE = "בטווח מציאה";

export const GEM_MAP_LEGEND_SECTION_HE = "שדונים";
export const GEM_MAP_LEGEND_OPEN_HE = "שדון לגלות";
export const GEM_MAP_TOGGLE_SHOW_HE = "הצג שדונים במפה";
export const GEM_MAP_TOGGLE_HIDE_HE = "הסתר שדונים במפה";

export const GEM_FAB_HUNT_ARIA_HE = "חיפוש שדון נסתר";
export const GEM_FAB_ALL_FOUND_ARIA_HE = "כל השדונים — פתיחת האוסף";
export const GEM_FAB_APPROACH_TITLE_HE = "שדון קרוב — התקרבו לבית";
export const GEM_FAB_HUNT_TITLE_HE = "בטווח מציאה — פתחו מצלמה!";
export const GEM_FAB_ALL_FOUND_TITLE_HE = "כל השדונים נמצאו — לתיק האוצר!";
export const GEM_FAB_FOUND_COUNT_ARIA_HE = (n: number) => `${n} שדונים`;

export const GEM_HOUSE_KICKER_HE = "שדון נסתר · גלו במצלמה";
export const GEM_ACTION_FIND_HE = "מצא שדון";
/** Cluster ⋮ menu — start sequential hunt for every booth/unit at the address. */
export const GEM_CLUSTER_FIND_ALL_HE = "מצא הכל";
export const GEM_CLUSTER_FOUND_ALL_HE = "מצאתי הכל";

export const GEM_RESET_TITLE_HE = "לאפס מציאת שדון?";
export const GEM_RESET_BODY_ONE_HE = "השדון יוסר מהמכשיר — אפשר לחפש מחדש.";
export const GEM_RESET_CLUSTER_TITLE_HE = "לאפס מציאת שדונים?";
export const GEM_RESET_CLUSTER_BODY_HE =
  "כל השדונים בכתובת הזו יוסרו מהמכשיר — אפשר לחפש מחדש.";
export const GEM_MAP_COMPLETE_TITLE_HE = "כל השדונים נמצאו!";

export const GEM_COLLECT_NEW_HE = "כל הכבוד!! מצאתם שדון חדש!";
export const GEM_ALBUM_SLOTS_HE = "שדונים באוסף";
export const GEM_ALBUM_ALL_HE = "כל השדונים";

export const GEM_WALK_STRAIGHT_HE = "המשיכו ישר — השדון מולכם";
export const GEM_WALK_BEHIND_HE = "השדון מאחוריכם — סובבו את הגוף";
export const GEM_WALK_TURN_RIGHT_HE = "סובבו ימינה לכיוון השדון";
export const GEM_WALK_TURN_LEFT_HE = "סובבו שמאלה לכיוון השדון";
export const GEM_WALK_APPROACH_HE = "התקרבו לנקודת השדון";
export const GEM_WALK_MAPS_ARIA_HE = "הנחיות הליכה לשדון";
export const GEM_WALK_MAPS_LINK_HE = "הליכה ב-Google Maps לשדון";

export const GEM_PANEL_NEAR_GPS_HE = "ליד השדון — המתינו רגע ל-GPS";
export const gemPanelApproachHe = (m: number) => `התקרבו ל־${m} מ׳ לשדון על המדרכה`;
export const gemPanelOpenCameraHe = (m: number) => `~${m} מ׳ לשדון — פתחו מצלמה`;

export const GEM_TELL_ME_RANGE_HE = "יש להתקרב לשדון כדי להשתמש ב«גלה לי»";
export const GEM_AR_LOCATING_HE = "מאתרים את השדון על המדרכה (אותה נקודה כמו במפה)…";
export const GEM_BEARING_ARIA_HE = (label: string, distance?: string) =>
  `כיוון השדון: ${label}${distance ?? ""}`;

export const GEM_ORBIT_PICK_HOUSE_HE = "בחרו בית מהרשימה כדי לסובב את השדון";

export const GEM_ANCHOR_UPDATE_PUBLIC_HE = "עדכון מיקום שדון (ליד הבית)";
export const GEM_ANCHOR_RESET_ONE_HE = "איפוס מיקום שדון";
export const GEM_ANCHOR_TITLE_CALIBRATED_HE = "מיקום שדון: מותאם בטלפון";
export const GEM_ANCHOR_TITLE_AUTO_HE = "מיקום שדון: אוטומטי ליד הבית";
export const GEM_ANCHOR_SET_GPS_HE = "קבע מיקום שדון כאן (GPS)";
export const GEM_ANCHOR_RESET_ALL_HE = (n: number) => `איפוס כל מיקומי השדון בטלפון (${n})`;
