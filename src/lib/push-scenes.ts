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
      "כל הממתקים אזלו",
      "בעל הבית מסמן «מקושט בלי ממתקים» — עדיין אפשר להסתכל.",
      withVisit("come"),
      withVisit("decorOnly"),
    ),
    houseScene(
      "back-active",
      "חזרת לפעילות",
      "בית שנסגר או עבר לקישוט בלבד חוזר ל«בואו».",
      withVisit("closed"),
      withVisit("come", "plenty"),
    ),
    houseScene(
      "on-break",
      "יוצא להפסקה",
      "בעל הבית מקפיא את הבית מהמפה. אם יש שעת חזרה — היא בגוף.",
      withVisit("come"),
      demoHouse({ ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }),
    ),
    houseScene(
      "back-from-break",
      "חזרת לפעילות (מההפסקה)",
      "מבטלים את ההקפאה והבית שוב פתוח.",
      demoHouse({ ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }),
      withVisit("come"),
    ),
    houseScene(
      "candy-out",
      "נגמרו הממתקים",
      "הבית עדיין מסומן «בואו», אבל מלאי הממתקים ירד לאדום / נגמר.",
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
  "בית מוקפא או לא מאושר — אין התראה, גם אם המלאי השתנה.",
  "שינוי שעות, תמונה, רמת פחד או קישוט בלי שינוי מלאי / מצב ביקור.",
  "מלאי שנשאר אותו דבר, או עלייה מכתום (מעט) חזרה לירוק — בלי התראה.",
] as const;
