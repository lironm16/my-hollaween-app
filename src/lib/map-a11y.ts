import {
  formatDisplayAddressWithPolicy,
  makeAddressRevealContext,
  type AddressRevealContext,
} from "@/lib/address-reveal";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";
import type { PublicHouse, VisitState } from "@/lib/types";

function visitAnnouncementLabel(locale: AppLocale, visit: VisitState): string {
  const m = messagesForLocale(locale).mapUi;
  if (visit === "come") return m.visitCome;
  if (visit === "decorOnly") return m.visitDecorOnly;
  return m.visitClosed;
}

export function houseSelectionAnnouncement(
  house: PublicHouse,
  reveal?: AddressRevealContext,
  locale: AppLocale = "he",
): string {
  const ctx = reveal ?? makeAddressRevealContext({ now: new Date(), isAdmin: true });
  const address = formatDisplayAddressWithPolicy(house, house.id, ctx, locale);
  const visit = visitAnnouncementLabel(locale, house.visit);
  return formatMessage(messagesForLocale(locale).mapUi.selectedHouse, {
    name: house.name,
    address,
    visit,
  });
}
