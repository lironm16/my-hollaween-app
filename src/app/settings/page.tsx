"use client";

import { AppHeader } from "@/components/app-header";
import { DeviceSettings } from "@/components/device-settings";

export default function SettingsPage() {
  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-10">
          <h1 className="font-display text-2xl text-orange-300">הגדרות</h1>
          <p className="text-base text-violet-300">ההגדרות נשמרות רק במכשיר הזה.</p>
          <DeviceSettings />
        </div>
      </main>
    </div>
  );
}
