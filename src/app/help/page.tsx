import { gemHuntPublicFromDb } from "@/lib/event-settings";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getDbSnapshot } from "@/lib/store/houses";
import { HelpPageClient } from "./help-page-client";

export default async function HelpPage() {
  const [nightPass, db] = await Promise.all([readNightPassSettings(), getDbSnapshot()]);
  return (
    <HelpPageClient
      eventDeviceHelpFromServer={nightPass.enabled}
      gemHuntPublicFromServer={gemHuntPublicFromDb(db.eventSettings)}
    />
  );
}
