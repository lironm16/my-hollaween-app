import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { renderUserGuideHtml } from "@/lib/user-guide-markdown";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "מדריך משתמש — הלואין בשכונה",
  description: "מדריך מפורט לכל תכונות האפליקציה — מפה, מסלול, סינון, הוספת בית ועוד.",
};

export default async function GuidePage() {
  const html = await renderUserGuideHtml();

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-3xl space-y-4 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl text-orange-300">מדריך משתמש</h1>
            <Link
              href="/guide.html"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-orange-400/40 text-orange-100")}
            >
              גרסה HTML לשיתוף
            </Link>
          </div>
          <p className="text-base text-violet-300">
            מדריך מלא לכל התכונות — מבקרים ובעלי בתים (ללא מנהל).
          </p>
          <article
            className="user-guide rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/20 sm:p-6"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </main>
    </div>
  );
}
