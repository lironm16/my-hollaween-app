import { PreviewNav } from "@/components/preview-nav";
import { PushNotice } from "@/components/push-notice";
import { config } from "@/lib/config";
import { PUSH_SILENT_CASES, pushPreviewScenes } from "@/lib/push-scenes";

export default function PushPreviewPage() {
  const scenes = pushPreviewScenes();
  const houseScenes = scenes.filter((scene) => scene.kind === "house");
  const adminScenes = scenes.filter((scene) => scene.kind === "admin");

  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.appName} · התראות דחיפה</p>
          <h1 className="text-2xl font-semibold text-orange-100">איך נראות ההתראות בטלפון</h1>
          <p className="text-base text-violet-200">
            אלה באנרים כמו במסך הנעילה: אייקון הדלעת, עברית מימין לשמאל, כותרת וטקסט. לחיצה על התראת
            בית פותחת את המפה על אותו בית; מסר מהמנהלים פותח את המפה הראשית. מזהה הבית לא מופיע בטקסט.
          </p>
          <PreviewNav current="/preview/push" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">על מסך הנעילה</h2>
          <p className="text-base text-violet-300">
            שתי דוגמאות זו מעל זו — כמו כמה עדכונים באותו ערב. הדפדפן מצייר את הכרטיס, האפליקציה רק
            שולחת כותרת, טקסט ואייקון.
          </p>
          <div className="space-y-2 rounded-2xl bg-[#0c0612] p-4 ring-1 ring-white/8">
            <PushNotice payload={houseScenes[0]!.payload} time="21:14" />
            <PushNotice payload={adminScenes[0]!.payload} time="20:02" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-orange-100">עדכוני לילה — אוטומטיים</h2>
          <p className="text-base text-violet-300">
            נשלחים כשבעל בית מעדכן מלאי או מצב ביקור בבית שמפורסם במפה. חמש כותרות שונות, ואותה כותרת
            «יש שוב ממתקים» לשני מקרים.
          </p>
          {houseScenes.map((scene) => (
            <article
              key={scene.id}
              id={scene.id}
              className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-medium text-orange-100">{scene.name}</h3>
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-base font-medium text-orange-200">
                  אוטומטי
                </span>
              </div>
              <p className="text-base text-violet-200">{scene.when}</p>
              <PushNotice payload={scene.payload} />
              <p className="text-base text-violet-400" dir="ltr">
                {scene.payload.url}
              </p>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-orange-100">מסר מהמנהלים</h2>
          {adminScenes.map((scene) => (
            <article
              key={scene.id}
              id={scene.id}
              className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-medium text-orange-100">{scene.name}</h3>
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-base font-medium text-violet-100">
                  ידני
                </span>
              </div>
              <p className="text-base text-violet-200">{scene.when}</p>
              <PushNotice payload={scene.payload} />
            </article>
          ))}
        </section>

        <section className="space-y-2 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">מתי אין התראה</h2>
          <ul className="list-disc space-y-1.5 ps-5 text-base text-violet-200">
            {PUSH_SILENT_CASES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
