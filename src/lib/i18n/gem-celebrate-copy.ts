import type { GemBagCelebrateKind } from "@/lib/gem-bag-celebrate";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

const PREFIX: Record<GemBagCelebrateKind, string> = {
  map: "celebrateMap",
  album: "celebrateAlbum",
  "map-album": "celebrateDual",
};

export function gemCelebrateCopy(locale: AppLocale, kind: GemBagCelebrateKind) {
  const p = PREFIX[kind];
  return {
    kicker: translate(locale, `gem.${p}Kicker`),
    title: translate(locale, `gem.${p}Title`),
    sub: translate(locale, `gem.${p}Sub`),
  };
}
