"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { HelpShell } from "@/components/help-shell";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminSession } from "@/hooks/use-admin-session";
import { catalogScopeOf } from "@/lib/catalog-sync";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { GEM_GAME_TITLE_HE } from "@/lib/gem-hunt-copy";

type HelpLink = { question: string; href: string };

const QUESTIONS: HelpLink[] = [
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
];

const EVENT_DEVICE_QUESTIONS: HelpLink[] = [
  {
    question: "חיבור מכשירים — בעלי בתים",
    href: "/help/event-device-owner",
  },
  {
    question: "יש לי קוד כניסה — אורחים",
    href: "/help/event-device-visitor",
  },
];

export type HelpPageClientProps = {
  /** SSR snapshot: show event-device help when night-pass catalog is active. */
  eventDeviceHelpFromServer: boolean;
  /** SSR snapshot: gem hunt help for visitors (admins always see hunt UI client-side). */
  gemHuntPublicFromServer: boolean;
};

function showEventDeviceHelp(
  catalogScope: string | undefined,
  eventDeviceHelpFromServer: boolean,
): boolean {
  if (catalogScope !== undefined) {
    return catalogScope !== "legacy";
  }
  return eventDeviceHelpFromServer;
}

function gemHuntHelpVisible(
  isAdmin: boolean,
  catalogGemPublic: boolean | undefined,
  gemHuntPublicFromServer: boolean,
): boolean {
  const gemPublic =
    catalogGemPublic === true || (catalogGemPublic === undefined && gemHuntPublicFromServer);
  return gemHuntVisible(isAdmin, gemPublic);
}

export function HelpPageClient({
  eventDeviceHelpFromServer,
  gemHuntPublicFromServer,
}: HelpPageClientProps) {
  const { admin } = useAdminSession();
  const { catalog } = useCatalog();

  const items = useMemo(() => {
    const list = [...QUESTIONS];
    const scope = catalog?.scope !== undefined ? catalogScopeOf(catalog) : undefined;
    if (showEventDeviceHelp(scope, eventDeviceHelpFromServer)) {
      list.splice(2, 0, ...EVENT_DEVICE_QUESTIONS);
    }
    if (
      gemHuntHelpVisible(admin, catalog?.eventSettings?.gemHuntPublic, gemHuntPublicFromServer)
    ) {
      list.push({ question: GEM_GAME_TITLE_HE, href: "/help/gem-hunt" });
    }
    return list;
  }, [admin, catalog, eventDeviceHelpFromServer, gemHuntPublicFromServer]);

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
