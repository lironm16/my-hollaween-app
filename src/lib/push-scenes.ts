import { importantHouseAlert, payloadForKind, sanitizePushPayload, type PushPayload } from "@/lib/push";
import type { House, StockLevel, VisitState } from "@/lib/types";

export type PushSceneKind = "house" | "admin";

export type PushScene = {
  id: string;
  kind: PushSceneKind;
  /** Short type name shown above the banner. */
  name: string;
  /** When this notification is sent. */
  when: string;
  payload: PushPayload;
};

const STAMP = "2026-10-31T18:00:00.000Z";

function demoHouse(overrides: Partial<House> = {}): House {
  return {
    id: "preview-levy",
    name: "בית משפחת לוי",
    theme: "pumpkin",
    address: "חרוזים 8, חרוזים",
    arrival: "",
    description: "",
    lat: 32.0916477,
    lng: 34.8028691,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    decorLevel: "medium",
    decorated: true,
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "000000",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

function withVisit(visit: VisitState, candy: StockLevel = "plenty"): House {
  return demoHouse({
    visit,
    soldOut: visit === "closed",
    treatStock: { candy },
    treats: ["candy"],
  });
}

function houseScene(
  id: string,
  name: string,
  when: string,
  prev: House,
  next: House,
): PushScene {
  const payload = importantHouseAlert(prev, next);
  if (!payload) {
    throw new Error(`Expected a house alert for scene ${id}`);
  }
  return { id, kind: "house", name, when, payload };
}

/** Every payload the phone can show — generated from the real send path. */
export function pushPreviewScenes(): PushScene[] {
  return [
    houseScene(
      "stock-gone",
      "נסגר לביקור",
      "בעל הבית מסמן שהערב נגמר לביקור. כותרת עם הכינוי, תודה, ואז כתובת.",
      withVisit("come"),
      withVisit("closed"),
    ),
    houseScene(
      "decor-only",
      "מקושט בלי ממתקים",
      "בעל הבית מסמן «בלי ממתקים» — הבית מקושט בלי חלוקת ממתקים.",
      withVisit("come", "plenty"),
      demoHouse({
        visit: "decorOnly",
        treats: [],
        treatStock: {},
        decorLevel: "medium",
        decorated: true,
      }),
    ),
    houseScene(
      "back-active",
      "חזרה לפעילות",
      "בית שנסגר או היה מקושט בלבד חוזר לפתוח.",
      withVisit("closed"),
      withVisit("come", "plenty"),
    ),
    houseScene(
      "on-break",
      "הפסקה",
      "בעל הבית מקפיא את הבית מהמפה. אם יש שעת חזרה — היא בגוף; בלי שעה — רק הכתובת.",
      withVisit("come"),
      demoHouse({ ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }),
    ),
    houseScene(
      "back-from-break",
      "חזרה לפעילות",
      "מבטלים הקפאה והבית שוב פתוח.",
      demoHouse({ ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }),
      withVisit("come"),
    ),
    houseScene(
      "candy-out",
      "נגמרו הממתקים",
      "הבית עדיין פתוח לביקור, אבל מלאי הממתקים נגמר.",
      withVisit("come", "plenty"),
      withVisit("come", "out"),
    ),
    houseScene(
      "candy-low",
      "מעט ממתקים",
      "מלאי הממתקים ירד מירוק (יש) לכתום (מעט), והבית עדיין מזמין לבוא.",
      withVisit("come", "plenty"),
      withVisit("come", "low"),
    ),
    houseScene(
      "candy-restock",
      "חזרו למלאי",
      "אותה כותרת «חזרו למלאי» כשהבית כבר פתוח ורק המלאי התמלא.",
      withVisit("come", "out"),
      withVisit("come", "plenty"),
    ),
    {
      id: "house-added",
      kind: "house",
      name: "בית חדש במפה",
      when: "נשלח אוטומטית אחרי הוספת בית חדש.",
      payload: payloadForKind("houseAdded", demoHouse()) ?? sanitizePushPayload({
        title: "בית משפחת לוי הצטרף למפה!",
        body: "מוזמנים להגיע\nחרוזים 8, חרוזים",
        url: "/?focus=preview-levy",
      }),
    },
    {
      id: "admin-broadcast",
      kind: "admin",
      name: "מסר מהמנהלים",
      when: "מנהל שולח הודעה חופשית מ־/admin לכל מי שהפעיל התראות. הכותרת עד 80 תווים, הטקסט עד 280. לחיצה פותחת את המפה.",
      payload: sanitizePushPayload({
        title: "גשם בערב",
        body: "הגשם מתחיל, הממתקים בחוץ עד 21:00",
        url: "/",
      }),
    },
  ];
}

export const PUSH_SILENT_CASES = [
  "בית בהפסקה, סגור לביקור, או בין חלונות שעות — אין התראת ממתקים, גם אם המלאי השתנה.",
  "שינוי שעות, תמונה, רמת פחד או קישוט בלי שינוי מלאי / מצב ביקור.",
  "מלאי שנשאר אותו דבר, או עלייה מכתום (מעט) חזרה לירוק — בלי התראה.",
] as const;
