"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HelpShell } from "@/components/help-shell";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { useLocale } from "@/hooks/use-locale";
import { useNightPass } from "@/hooks/use-night-pass";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { refreshNightPassState } from "@/lib/night-pass-client";

type HelpLinkKey = keyof typeof import("@/lib/i18n/messages/help-he").helpMessagesHe.index.links;

const LINK_HREF: Record<HelpLinkKey, string> = {
  contact: "/help/contact",
  addHouse: "/help/add-house",
  eventDeviceOwner: "/help/event-device-owner",
  eventDeviceVisitor: "/help/event-device-visitor",
  install: "/help/install",
  filter: "/help/filter",
  createRoute: "/help/create-route",
  duringRoute: "/help/during-route",
  scanVisit: "/help/scan-visit",
  shareEditCode: "/help/share-edit-code",
  editCode: "/help/edit-code",
  gemHunt: "/help/gem-hunt",
  gemPlaceDemon: "/help/gem-place-demon",
};

const BASE_ORDER: HelpLinkKey[] = [
  "contact",
  "addHouse",
  "install",
  "filter",
  "createRoute",
  "duringRoute",
  "scanVisit",
  "shareEditCode",
  "editCode",
];

const EVENT_DEVICE_ORDER: HelpLinkKey[] = ["eventDeviceOwner", "eventDeviceVisitor"];

export type HelpPageClientProps = {
  eventDeviceHelpFromServer: boolean;
  gemHuntPublicFromServer: boolean;
};

export function HelpPageClient({
  eventDeviceHelpFromServer,
  gemHuntPublicFromServer,
}: HelpPageClientProps) {
  const { dir } = useLocale();
  const { help } = useHelpMessages();
  const { admin } = useAdminSession();
  const { catalog } = useCatalog();
  const nightPass = useNightPass();

  useEffect(() => {
    void refreshNightPassState({ force: true });
  }, []);

  const eventDeviceHelp = eventDeviceHelpFromServer || nightPass.enabled;
  const gemHuntPublic =
    catalog?.eventSettings?.gemHuntPublic === true || gemHuntPublicFromServer;

  const items = useMemo(() => {
    const keys: HelpLinkKey[] = [...BASE_ORDER];
    if (eventDeviceHelp) {
      keys.splice(2, 0, ...EVENT_DEVICE_ORDER);
    }
    if (gemHuntVisible(admin, gemHuntPublic)) {
      keys.push("gemHunt", "gemPlaceDemon");
    }
    return keys.map((key) => ({
      href: LINK_HREF[key],
      question: help.index.links[key],
    }));
  }, [admin, eventDeviceHelp, gemHuntPublic, help.index.links]);

  const Chevron = dir === "ltr" ? ChevronRight : ChevronLeft;

  return (
    <HelpShell title={help.index.title} backHref="/" backLabel={help.shell.backToMap}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-[#1d1028] px-4 py-5 ring-1 ring-orange-500/20 transition hover:bg-[#241332]"
            >
              <span className="min-w-0 flex-1 text-xl font-medium text-orange-50">{item.question}</span>
              <Chevron className="size-7 shrink-0 text-orange-400/70" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </HelpShell>
  );
}
