import { EventCreatorScreen } from "@/components/event-creator-screen";

/** Leaflet map chunk is client-only (see event-creator-map-dynamic). */
export const dynamic = "force-dynamic";

/** Beta — custom multi-hood events (branch only). */
export default function EventCreatePage() {
  return <EventCreatorScreen />;
}
