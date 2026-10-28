import { toast } from "sonner";
import { defaultAppLocale, readStoredAppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

export async function copyText(text: string, okMessage: string, failMessage?: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
    return true;
  } catch {
    const locale = readStoredAppLocale() ?? defaultAppLocale();
    toast.error(failMessage ?? translate(locale, "codesCopy.copyFailed"));
    return false;
  }
}
