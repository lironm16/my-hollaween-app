import { PreviewNav } from "@/components/preview-nav";
import { PushNotice } from "@/components/push-notice";
import { config } from "@/lib/config";

const PLACE = "חרוזים 8, חרוזים";
const NICK = "הבית הרדוף";

function withPlace(lead: string) {
  return `${lead}\n${PLACE}`;
}

const backScenes = [
  {
    id: "back-active",
    label: "חוזרים מ«הפסקה» או מ«סגור» לפתוח",
    time: "20:01",
    payload: {
      title: `${NICK} חזרת לפעילות!`,
      body: withPlace("מוזמנים להגיע"),
      url: "/",
    },
  },
] as const;

const visitChoiceScenes = [
  {
    id: "decor-only",
    label: "בעל הבית מסמן «מקושט בלי ממתקים» — עדיין אפשר להסתכל",
    time: "19:10",
    payload: {
      title: `${NICK} - כל הממתקים אזלו...`,
      body: withPlace("מוזמנים עדיין לבוא לראות את הבית המקושט"),
      url: "/",
    },
  },
  {
    id: "closed-visits",
    label: "בעל הבית מסמן «נגמר המלאי» — נסגר לביקור",
    time: "21:14",
    payload: {
      title: `${NICK} נסגר לביקור`,
      body: withPlace("מקווים שנהניתם!"),
      url: "/",
    },
  },
] as const;

const breakScenes = [
  {
    id: "break-haunted",
    label: "כינוי נושא + שעת חזרה",
    time: "18:12",
    payload: {
      title: `${NICK} יוצא להפסקה`,
      body: withPlace("נחזור ב־20:00"),
      url: "/",
    },
  },
  {
    id: "break-soon",
    label: "בלי שעה — נחזור בקרוב",
    time: "19:40",
    payload: {
      title: `${NICK} יוצא להפסקה`,
      body: withPlace("נחזור בקרוב"),
      url: "/",
    },
  },
] as const;

const stockScenes = [
  {
    id: "candy-back",
    payload: {
      title: `🎉 ${NICK} — חזרו למלאי!`,
      body: PLACE,
      url: "/",
    },
  },
  {
    id: "candy-low",
    payload: {
      title: `🏃 ${NICK} — נשאר מעט!`,
      body: PLACE,
      url: "/",
    },
  },
] as const;

export default function PushCopyTryPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.appName} · ניסוי כותרת</p>
          <h1 className="text-2xl font-semibold text-orange-100">כינוי הבית בכותרת</h1>
          <p className="text-base text-violet-200">
            כינוי בכותרת, ואז משפט קצר. השורה האחרונה תמיד רחוב ושכונה. «מקושט בלי ממתקים» ו«נסגר» הם שני
            מצבים שונים — לפי מה שבעל הבית בוחר.
          </p>
          <PreviewNav current="/preview/push" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">חזרה לפעילות</h2>
          <div className="space-y-4 rounded-2xl bg-[#0c0612] p-4 ring-1 ring-white/8">
            {backScenes.map((scene) => (
              <div key={scene.id} id={scene.id} className="space-y-2">
                <p className="text-base text-violet-400">{scene.label}</p>
                <PushNotice payload={scene.payload} time={scene.time} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">לפי מה שבעל הבית מסמן</h2>
          <div className="space-y-4 rounded-2xl bg-[#0c0612] p-4 ring-1 ring-white/8">
            {visitChoiceScenes.map((scene) => (
              <div key={scene.id} id={scene.id} className="space-y-2">
                <p className="text-base text-violet-400">{scene.label}</p>
                <PushNotice payload={scene.payload} time={scene.time} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">הפסקה</h2>
          <div className="space-y-4 rounded-2xl bg-[#0c0612] p-4 ring-1 ring-white/8">
            {breakScenes.map((scene) => (
              <div key={scene.id} id={scene.id} className="space-y-2">
                <p className="text-base text-violet-400">{scene.label}</p>
                <PushNotice payload={scene.payload} time={scene.time} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">מלאי, כשהבית פתוח</h2>
          <div className="space-y-2">
            {stockScenes.map((scene) => (
              <PushNotice key={scene.id} payload={scene.payload} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
