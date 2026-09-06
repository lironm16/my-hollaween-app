import Link from "next/link";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { formatHoursLabel, hoursStatus } from "@/lib/hours";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Demo house with two evening windows on Halloween night. */
const demoHouse = {
  name: "בית הדלעת",
  openFrom: "17:00",
  openTo: "18:00",
  openFrom2: "20:00",
  openTo2: "21:00",
  openHours: [
    { from: "17:00", to: "18:00" },
    { from: "20:00", to: "21:00" },
  ],
  visit: "come" as const,
};

type Scene = {
  id: string;
  title: string;
  clockLabel: string;
  now: Date;
};

function scene(id: string, title: string, clockLabel: string, now: Date): Scene {
  return { id, title, clockLabel, now };
}

const scenes: Scene[] = [
  scene(
    "before-event",
    "לפני 31 באוקטובר (היום)",
    "2 בספטמבר · 12:00",
    new Date(2026, 8, 2, 12, 0),
  ),
  scene(
    "morning",
    "ב־31 באוקטובר — בוקר (עדיין רחוק מפתיחה)",
    "31 באוקטובר · 10:00",
    new Date(2026, 9, 31, 10, 0),
  ),
  scene(
    "opens-soon-1",
    "חצי שעה לפני חלון ראשון",
    "31 באוקטובר · 16:40",
    new Date(2026, 9, 31, 16, 40),
  ),
  scene(
    "open-1",
    "פתוח בחלון הראשון",
    "31 באוקטובר · 17:20",
    new Date(2026, 9, 31, 17, 20),
  ),
  scene(
    "closing-1",
    "נסגר בקרוב (סוף חלון ראשון)",
    "31 באוקטובר · 17:45",
    new Date(2026, 9, 31, 17, 45),
  ),
  scene(
    "between",
    "בין החלונות — הפסקה",
    "31 באוקטובר · 18:30",
    new Date(2026, 9, 31, 18, 30),
  ),
  scene(
    "opens-soon-2",
    "חצי שעה לפני חלון שני",
    "31 באוקטובר · 19:40",
    new Date(2026, 9, 31, 19, 40),
  ),
  scene(
    "open-2",
    "פתוח בחלון השני",
    "31 באוקטובר · 20:15",
    new Date(2026, 9, 31, 20, 15),
  ),
  scene(
    "after",
    "אחרי סיום הערב",
    "31 באוקטובר · 21:30",
    new Date(2026, 9, 31, 21, 30),
  ),
];

function kindLabel(kind: string) {
  switch (kind) {
    case "beforeEvent":
      return "לפני האירוע";
    case "before":
      return "לפני הפתיחה באותו יום";
    case "opensSoon":
      return "נפתח בקרוב (טורקיז)";
    case "open":
      return "פתוח — בלי באנר";
    case "closingSoon":
      return "נסגר בקרוב (כתום)";
    case "between":
      return "הפסקה בין חלונות";
    case "after":
      return "סגור";
    default:
      return kind;
  }
}

export default function HoursPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="space-y-2">
          <p className="text-base text-violet-300">{config.brandEn} · תצוגת שעות</p>
          <h1 className="text-2xl font-semibold text-orange-100">איך ייראו הודעות השעות</h1>
          <p className="text-base text-violet-200">
            בית לדוגמה עם שני חלונות:{" "}
            <span className="font-medium text-orange-100" dir="ltr">
              {formatHoursLabel(demoHouse)}
            </span>
            . כל כרטיס מדמה שעון אחר — בלי לחכות ל־31 באוקטובר.
          </p>
          <Link href="/" className="inline-block text-base text-orange-300 underline-offset-2 hover:underline">
            חזרה למפה
          </Link>
        </header>

        <div className="space-y-4">
          {scenes.map((item) => {
            const status = hoursStatus(demoHouse, item.now);
            return (
              <section
                key={item.id}
                id={item.id}
                className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
              >
                <div className="space-y-1">
                  <h2 className="text-base font-medium text-orange-100">{item.title}</h2>
                  <p className="text-base text-violet-300">
                    שעון מדומה: {item.clockLabel} · מצב: {kindLabel(status.kind)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#140a1c]/70 p-3 ring-1 ring-orange-500/10">
                  <p className="text-base font-medium text-orange-100">{demoHouse.name}</p>
                  <p className="mt-1 text-base text-violet-200" dir="ltr">
                    {formatHoursLabel(demoHouse)}
                  </p>
                  <div className="mt-2">
                    <HoursStatusBanner house={demoHouse} now={item.now} className="text-base" />
                    {status.kind === "open" ? (
                      <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-base text-emerald-200">
                        פתוח עכשיו — אין באנר אזהרה (רק שעות למעלה)
                      </p>
                    ) : null}
                    {item.id === "closing-1" ? (
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="house-pin is-closing-soon relative"
                          style={{ background: "#6d28d9" }}
                          aria-label="נסגר בקרוב"
                        >
                          <i className="pin-hours-ring is-closing" aria-hidden />
                          <span>🎃</span>
                        </div>
                        <p className="text-base text-orange-200">
                          על המפה: עיגול כתום שנמוג לאט סביב הסיכה בחצי השעה האחרונה. בכרטיס: ״נסגר בקרוב ב־…״ בלי אייקון.
                        </p>
                      </div>
                    ) : null}
                    {item.id === "opens-soon-1" || item.id === "opens-soon-2" ? (
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="house-pin is-opening-soon relative"
                          style={{ background: "#6d28d9" }}
                          aria-label="נפתח בקרוב"
                        >
                          <i className="pin-hours-ring is-opening" aria-hidden />
                          <span>🎃</span>
                        </div>
                        <p className="text-base text-cyan-100">
                          על המפה: עיגול טורקיז שנמוג לאט סביב הסיכה בחצי השעה שלפני הפתיחה. בכרטיס: ״נפתח בקרוב ב־…״ בלי אייקון.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
