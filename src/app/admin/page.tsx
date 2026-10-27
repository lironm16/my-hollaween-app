"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useLocale } from "@/hooks/use-locale";

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLocale();
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
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(
          data?.error || (res.status === 401 ? t("adminPage.wrongPassword") : t("adminPage.loginFailed")),
        );
        return;
      }
      setPassword("");
      await refresh();
      toast.success(t("adminPage.loginSuccess"));
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-orange-200">
        {admin ? t("adminPage.redirectMap") : t("adminPage.checking")}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <h1 className="font-display text-2xl text-orange-300">{t("adminPage.title")}</h1>
        <form
          className="mt-6 space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25"
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <p className="text-base text-violet-200">{t("adminPage.intro")}</p>
          <div className="space-y-1.5">
            <Label>{t("adminPage.passwordLabel")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-orange-500 text-black">
            {t("adminPage.submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}
