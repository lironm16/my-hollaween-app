import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function loadChecklist() {
  try {
    return readFileSync(join(process.cwd(), "docs/MANUAL_TEST_CHECKLIST.md"), "utf8");
  } catch {
    return "לא הצלחנו לטעון את רשימת הבדיקות.";
  }
}

export default function ChecklistPage() {
  const markdown = loadChecklist();

  return (
    <div className="flex min-h-dvh flex-col bg-[#12081a]">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-orange-200">רשימת בדיקות ידניות</h1>
          <Link href="/" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            חזרה למפה
          </Link>
        </div>
        <article
          className="overflow-x-auto rounded-2xl bg-[#160b20] p-4 text-sm leading-relaxed text-violet-100 ring-1 ring-orange-500/20"
          dir="ltr"
          style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" }}
        >
          {markdown}
        </article>
      </main>
    </div>
  );
}
