"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HelpShell } from "@/components/help-shell";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import { GEM_GAME_TITLE_HE } from "@/lib/gem-hunt-copy";

const QUESTIONS = [
  {
    question: "עזרה אישית — טופס ליצירת קשר",
    href: "/help/contact",
  },
  {
    question: "איך מוסיפים בית?",
    href: "/help/add-house",
  },
  {
    question: "איך מתקינים את האפליקציה?",
    href: "/help/install",
  },
  {
    question: "איך מסננים בתים?",
    href: "/help/filter",
  },
  {
    question: "איך יוצרים מסלול?",
    href: "/help/create-route",
  },
  {
    question: "במהלך המסלול",
    href: "/help/during-route",
  },
  {
    question: "איך סורקים QR לביקור?",
    href: "/help/scan-visit",
  },
  {
    question: "איך לשתף קוד עריכה?",
    href: "/help/share-edit-code",
  },
  {
    question: "איבדתי את קוד העריכה",
    href: "/help/edit-code",
  },
] as const;

const GEM_HUNT_QUESTION = {
  question: GEM_GAME_TITLE_HE,
  href: "/help/gem-hunt",
} as const;

export default function HelpPage() {
  const { admin } = useAdminSession();
  const now = useAppNow();
  const { gemUiVisible: showGemHuntHelp } = useGemHuntAdminUi(admin);
  const items = showGemHuntHelp ? [...QUESTIONS, GEM_HUNT_QUESTION] : QUESTIONS;

  return (
    <HelpShell title="שאלות ותשובות" backHref="/" backLabel="מפה">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-[#1d1028] px-4 py-5 ring-1 ring-orange-500/20 transition hover:bg-[#241332]"
            >
              <span className="min-w-0 flex-1 text-xl font-medium text-orange-50">{item.question}</span>
              <ChevronLeft className="size-7 shrink-0 text-orange-400/70" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </HelpShell>
  );
}
