/** Server + client — push alerts feature gate (NEXT_PUBLIC_PUSH_ALERTS=1 to enable). */
export function pushAlertsEnabled() {
  return process.env.NEXT_PUBLIC_PUSH_ALERTS === "1";
}
