"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";

export default function AdminPage() {
  const router = useRouter();
  const { ready, admin, refresh } = useAdminSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [loginHint, setLoginHint] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { loginEnabled?: boolean; loginHint?: string | null }) => {
        setLoginEnabled(data.loginEnabled !== false);
        setLoginHint(typeof data.loginHint === "string" ? data.loginHint : null);
      })
      .catch(() => {
        setLoginEnabled(true);
      });
  }, []);

  useEffect(() => {
    if (ready && admin) router.replace("/");
  }, [ready, admin, router]);

  async function login() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error || (res.status === 401 ? "סיסמה שגויה" : "לא הצלחנו להיכנס. נסו שוב."));
        return;
      }
      setPassword("");
      await refresh();
      toast.success("נכנסתם כמנהלים");
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-orange-200">
        {admin ? "עוברים למפה…" : "בודקים הרשאות…"}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <h1 className="font-display text-2xl text-orange-300">כניסת מנהל</h1>
        <form
          className="mt-6 space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25"
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <p className="text-base text-violet-200">
            אחרי הכניסה תישארו במפה הרגילה. תוכלו לערוך בלי קוד ולמחוק בתים, עד שתלחצו יציאה.
          </p>
          {loginHint ? (
            <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/30">
              {loginHint}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label>סיסמת מנהל</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={!loginEnabled}
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !loginEnabled}
            className="w-full bg-orange-500 text-black"
          >
            {loginEnabled ? "כניסה למפה" : "כניסה לא זמינה בשרת"}
          </Button>
        </form>
      </main>
    </div>
  );
}
