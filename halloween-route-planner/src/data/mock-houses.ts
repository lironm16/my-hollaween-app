import type { House } from "@/lib/types";
import { addHours, set } from "date-fns";

const now = new Date();

const tonight = set(now, {
  hours: 18,
  minutes: 0,
  seconds: 0,
  milliseconds: 0,
});

function iso(date: Date) {
  return date.toISOString();
}

export const mockHouses: House[] = [
  {
    id: "house-emerald",
    title: "בית המכשפה הידידותית",
    description:
      "פינות צילום זוהרות בחושך, מסלול נגיש לכולם וסוכריות ללא גלוטן.",
    address: "רחוב הלבנה 12",
    city: "תל אביב",
    latitude: 32.0853,
    longitude: 34.7818,
    status: "active",
    scareLevel: "low",
    accessibility: ["wheelchair", "stroller", "hearing"],
    dietary: ["gluten-free", "nut-free"],
    candyLevel: "green",
    defaultImage: true,
    hours: [
      {
        day: 5,
        start: "17:00",
        end: "21:30",
      },
      {
        day: 6,
        start: "18:00",
        end: "23:00",
      },
    ],
    contactInstructions: "לא לדפוק על הדלת — יש פעמון לדלת בצד שמאל.",
    allowKnock: false,
    routeNotes: "חניה בכחול-לבן ברחוב המקביל.",
    decorationVotes: 42,
    checkIns: 128,
    imageUrl:
      "https://images.unsplash.com/photo-1506344200962-4023a1c6bdc4?auto=format&fit=crop&w=800&q=80",
    lastUpdated: iso(addHours(tonight, -1)),
  },
  {
    id: "house-midnight",
    title: "אחוזת ערפדי החצות",
    description: "חדרי בריחה קטנים ומופע אור-קולי כל חצי שעה.",
    address: "שדרת האימה 8",
    city: "חיפה",
    latitude: 32.794,
    longitude: 34.9896,
    status: "active",
    scareLevel: "high",
    accessibility: ["visual"],
    dietary: ["vegan"],
    candyLevel: "yellow",
    defaultImage: false,
    imageUrl:
      "https://images.unsplash.com/photo-1572883381620-9853552c573d?auto=format&fit=crop&w=800&q=80",
    hours: [
      {
        day: 5,
        start: "19:00",
        end: "01:00",
      },
    ],
    contactInstructions: "דפיקה כפולה על דלת העץ השחורה.",
    allowKnock: true,
    decorationVotes: 86,
    checkIns: 204,
    routeNotes: "תביאו אטמי אוזניים למי שרגיש לרעש.",
    lastUpdated: iso(addHours(now, -0.5)),
  },
  {
    id: "house-candles",
    title: "בית הנרות הקסומים",
    description: "מסלול ריחני עם אזורים רגועים לילדים רגישים.",
    address: "נחל שלכת 4",
    city: "ירושלים",
    latitude: 31.7683,
    longitude: 35.2137,
    status: "paused",
    scareLevel: "medium",
    accessibility: ["low-sensory", "stroller", "wheelchair"],
    dietary: ["gluten-free", "kosher", "sugar-free"],
    candyLevel: "red",
    defaultImage: true,
    hours: [
      {
        day: 6,
        start: "16:30",
        end: "22:00",
      },
    ],
    contactInstructions: "נא לא לדפוק, יש מתנדבים בכניסה.",
    allowKnock: false,
    decorationVotes: 15,
    checkIns: 64,
    routeNotes: "נגמרו סוכריות, צפוי חידוש מלאי בשעה 20:00.",
    lastUpdated: iso(addHours(now, -0.2)),
  },
];
