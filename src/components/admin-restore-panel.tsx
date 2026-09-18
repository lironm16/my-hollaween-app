"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/api-json";
import {
  backupIsNewerThanServer,
  loadServerDbBackup,
  notifyCatalogChanged,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import type { House } from "@/lib/types";
import { Button } from "@/components/ui/button";

function formatWhen(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "לא ידוע";
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(ms);
}

export function AdminRestorePanel() {
  const [backup, setBackup] = useState<ServerDbBackup | null>(null);
  const [serverHouses, setServerHouses] = useState<number | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBackup(loadServerDbBackup());
    try {
      const res = await fetch("/api/admin/houses", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { houses?: House[]; updatedAt?: string };
      setServerHouses(data.houses?.length ?? 0);
      setServerUpdatedAt(data.updatedAt ?? null);
    } catch {
      /* keep last snapshot */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function restoreFromPhone() {
    const current = loadServerDbBackup();
    if (!current?.houses.length) {
      toast.error("אין גיבוי במכשיר הזה");
      return;
    }
    const serverLabel =
      serverHouses != null && serverUpdatedAt
        ? `${serverHouses} בתים בשרת (${formatWhen(serverUpdatedAt)})`
        : "השרת";
    const backupLabel = `${current.houses.length} בתים (${formatWhen(current.updatedAt)})`;
    const ok = window.confirm(
      `לשחזר את השרת מהגיבוי במכשיר?\n\nגיבוי: ${backupLabel}\n${serverLabel}\n\nפעולה זו תדרוס את כל הבתים בשרת.`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      const data = await readApiJson<{ error?: string; houses?: House[]; updatedAt?: string }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "השחזור נכשל");
        return;
      }
      if (data.houses && data.updatedAt) {
        saveServerDbBackup({
          updatedAt: data.updatedAt,
          houses: data.houses as ServerDbBackup["houses"],
        });
      }
      notifyCatalogChanged();
      toast.success(`שוחזרו ${data.houses?.length ?? current.houses.length} בתים לשרת`);
      await refresh();
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  if (!backup) {
    return (
      <div className="space-y-2 rounded-xl bg-black/25 p-3">
        <p className="text-base font-medium text-amber-100">גיבוי מכשיר</p>
        <p className="text-base text-violet-300">
          אין גיבוי שמור בטלפון הזה. הגיבוי נוצר אוטומטית כשאתם מנהלים ועורכים בתים.
        </p>
      </div>
    );
  }

  const backupNewer =
    serverUpdatedAt != null && backupIsNewerThanServer(backup, serverUpdatedAt);

  return (
    <div className="space-y-3 rounded-xl bg-black/25 p-3">
      <p className="text-base font-medium text-amber-100">שחזור מהמכשיר</p>
      <p className="text-base text-violet-300">
        הגיבוי נשמר בטלפון הזה בלבד. השחזור לא מתבצע אוטומטית — רק כשלוחצים כאן.
      </p>
      <div className="space-y-1.5 rounded-xl bg-[#12081a] px-3 py-2.5 text-base text-violet-200 ring-1 ring-orange-500/20">
        <p>
          <span className="text-orange-100">גיבוי במכשיר:</span> {backup.houses.length} בתים ·{" "}
          {formatWhen(backup.updatedAt)}
        </p>
        {serverHouses != null && serverUpdatedAt ? (
          <p>
            <span className="text-orange-100">שרת:</span> {serverHouses} בתים ·{" "}
            {formatWhen(serverUpdatedAt)}
          </p>
        ) : null}
        {serverUpdatedAt != null ? (
          <p className={backupNewer ? "text-emerald-300" : "text-amber-200"}>
            {backupNewer
              ? "הגיבוי במכשיר חדש יותר מהשרת."
              : "השרת חדש יותר — שחזור ידרוס את השרת."}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        disabled={busy}
        className="bg-orange-500 text-black hover:bg-orange-400"
        onClick={() => void restoreFromPhone()}
      >
        {busy ? "משחזר…" : "שחזור מהמכשיר לשרת"}
      </Button>
    </div>
  );
}
