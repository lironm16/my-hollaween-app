import { config } from "@/lib/config";

/** Server + client — push alerts feature gate (NEXT_PUBLIC_PUSH_ALERTS=0 to disable). */
export function pushAlertsEnabled() {
  const raw = process.env.NEXT_PUBLIC_PUSH_ALERTS;
  if (raw !== undefined) return raw !== "0";
  return config.pushAlertsEnabled;
}
