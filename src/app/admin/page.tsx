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
        toast.error("סיסמה שגויה");
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
            אחרי הכניסה תישארו במפה הרגילה. תוכלו לערוך בלי קוד, להקפיא או למחוק בתים, עד שתלחצו יציאה.
          </p>
          <div className="space-y-1.5">
            <Label>סיסמת מנהל</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-orange-500 text-black">
            כניסה למפה
          </Button>
        </form>
      </main>
    </div>
  );
}
