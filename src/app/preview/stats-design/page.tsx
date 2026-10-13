import Link from "next/link";
import { PreviewNav } from "@/components/preview-nav";

const MOCKS = [
  {
    href: "/preview/stats-mocks/stats-toggle-hood-mockup.html",
    title: "תמונת מצב — סה״כ / עכשיו",
    note: "מתג שכונות + מכשירים",
  },
  {
    href: "/preview/stats-mocks/stats-hood-split-mockup.html",
    title: "שכונה — בתים | מכשירים",
    note: "אריח מפוצל לכל שכונה",
  },
  {
    href: "/preview/stats-mocks/stats-live-hood-mockup.html",
    title: "בלוק חי לשכונות",
    note: "מספרים + מיני-מפה (ויזואלי)",
  },
  {
    href: "/preview/stats-mocks/hood-live-map-design-mockup.html",
    title: "מפה — צפיפות שכונות",
    note: "שכבת מכשירים על המפה (עיצוב)",
  },
] as const;

export default function PreviewStatsDesignPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">עיצוב · לא מחובר לשרת</p>
          <h1 className="text-2xl font-semibold text-orange-100">תמונת מצב — מוקאפים</h1>
          <p className="text-base text-violet-200">
            HTML סטטי לדיון. האפליקציה החיה ב־<Link href="/stats" className="text-orange-300 underline">/stats</Link>{" "}
            עדיין תמונת מצב הישנה.
          </p>
          <PreviewNav current="/preview/stats-design" />
        </header>
        <ul className="space-y-3">
          {MOCKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20 transition hover:ring-orange-500/40"
              >
                <p className="text-lg font-medium text-orange-100">{item.title}</p>
                <p className="text-base text-violet-300">{item.note}</p>
                <p className="mt-1 text-sm text-violet-500">{item.href}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
