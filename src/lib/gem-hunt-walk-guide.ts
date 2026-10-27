import { bearingClockLabel } from "@/lib/gem-hunt";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { translate } from "@/lib/i18n/translate";

export const GEM_BEHIND_TURN_DEG = 120;

function t(locale: AppLocale, key: string) {
  return translate(locale, `gem.${key}`);
}

export function gemWalkGuideCopy(
  locale: AppLocale,
  huntArrowPhoneRelative: boolean,
  facingTarget: boolean,
  turnBearing: number | null,
  gpsBearingToAnchor: number | null,
) {
  if (huntArrowPhoneRelative && turnBearing != null) {
    if (facingTarget) return t(locale, "walkStraight");
    if (Math.abs(turnBearing) >= GEM_BEHIND_TURN_DEG) {
      return t(locale, "walkBehind");
    }
    if (turnBearing > 0) return t(locale, "walkTurnRight");
    return t(locale, "walkTurnLeft");
  }
  if (gpsBearingToAnchor != null) {
    return formatMessage(t(locale, "walkGpsFallback"), {
      label: bearingClockLabel(gpsBearingToAnchor, locale),
    });
  }
  return t(locale, "walkApproach");
}
