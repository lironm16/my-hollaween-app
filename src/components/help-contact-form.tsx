"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collectHelpRequestContext } from "@/lib/help-request-client";
import { compressJpegFile } from "@/lib/compress-image";
import {
  HELP_REQUEST_PLATFORMS,
  HELP_REQUEST_ROLES,
  HELP_REQUEST_TOPICS,
  type HelpRequestPlatform,
  type HelpRequestRole,
  type HelpRequestTopic,
} from "@/lib/help-request-schema";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { cn } from "@/lib/utils";

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  labels,
}: {
  legend: string;
  name: string;
  value: T | "";
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-medium text-orange-100">{legend}</legend>
      <div className="flex flex-col gap-1 rounded-xl bg-[#12081a] p-1 ring-1 ring-orange-500/20">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition",
              value === option ? "bg-orange-500/15 text-orange-50" : "text-orange-50 hover:bg-orange-500/10",
            )}
          >
            <input
              type="radio"
              name={name}
              className="size-4 accent-orange-500"
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{labels[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function HelpContactForm() {
  const { help } = useHelpMessages();
  const copy = help.contactForm;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<HelpRequestRole | "">("");
  const [platform, setPlatform] = useState<HelpRequestPlatform | "">("");
  const [topic, setTopic] = useState<HelpRequestTopic | "">("");
  const [houseHint, setHouseHint] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const topicOptions = useMemo(() => HELP_REQUEST_TOPICS, []);

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadScreenshotIfNeeded(): Promise<string | undefined> {
    if (!photoFile) return undefined;
    const dataUrl = await compressJpegFile(photoFile);
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const uploadForm = new FormData();
    uploadForm.append("file", blob, "screenshot.jpg");
    const res = await fetch("/api/help-request/screenshot", { method: "POST", body: uploadForm });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? copy.errorUpload);
    }
    return data.url;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!role) {
      setError(copy.errorPickRole);
      return;
    }
    if (!platform) {
      setError(copy.errorPickPlatform);
      return;
    }
    setBusy(true);
    try {
      let screenshotUrl: string | undefined;
      if (photoFile) {
        try {
          screenshotUrl = await uploadScreenshotIfNeeded();
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : copy.errorUpload);
          return;
        }
      }

      const res = await fetch("/api/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.trim() || undefined,
          role,
          platform,
          topic: topic || undefined,
          houseHint: houseHint.trim() || undefined,
          message,
          screenshotUrl,
          company,
          context: collectHelpRequestContext(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ticket?: string };
      if (!res.ok) {
        const msg = data.error ?? copy.errorSubmit;
        setError(msg);
        toast.error(msg);
        return;
      }
      setTicket(data.ticket ?? "ok");
    } catch {
      const msg = copy.errorOffline;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-emerald-500/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="size-12 text-emerald-400" aria-hidden />
          <h2 className="text-xl font-semibold text-orange-50">{copy.successTitle}</h2>
          <p className="text-sm text-violet-300/90" dir="ltr">
            #{ticket}
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full bg-orange-500 text-black hover:bg-orange-400")}>
          {copy.successBack}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <p className="text-lg leading-relaxed text-orange-100/95">
        {copy.intro}
      </p>

      <div className="hidden" aria-hidden>
        <Label htmlFor="help-company">Company</Label>
        <Input
          id="help-company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help-name">{copy.nameLabel}</Label>
        <Input
          id="help-name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help-phone">{copy.phoneLabel}</Label>
        <Input
          id="help-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="050-1234567"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={24}
        />
      </div>

      <ChoiceGroup
        legend={copy.roleLegend}
        name="help-role"
        value={role}
        onChange={setRole}
        options={HELP_REQUEST_ROLES}
        labels={copy.role}
      />

      <ChoiceGroup
        legend={copy.platformLegend}
        name="help-platform"
        value={platform}
        onChange={setPlatform}
        options={HELP_REQUEST_PLATFORMS}
        labels={copy.platform}
      />

      <fieldset className="space-y-2">
        <legend className="text-base font-medium text-orange-100">{copy.topicLegend}</legend>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as HelpRequestTopic | "")}
          className="h-11 w-full rounded-lg border border-orange-500/25 bg-[#12081a] px-3 text-lg text-orange-50"
        >
          <option value="">{copy.topicPlaceholder}</option>
          {topicOptions.map((t) => (
            <option key={t} value={t}>
              {copy.topic[t]}
            </option>
          ))}
        </select>
      </fieldset>

      {role === "owner" ? (
        <div className="space-y-2">
          <Label htmlFor="help-house">{copy.houseLabel}</Label>
          <Input
            id="help-house"
            value={houseHint}
            onChange={(e) => setHouseHint(e.target.value)}
            className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
            maxLength={120}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="help-message">{copy.messageLabel}</Label>
        <Textarea
          id="help-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[8rem] border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={2000}
          placeholder={copy.messagePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help-photo">{copy.photoLabel}</Label>
        <p className="text-sm text-violet-300/90">{copy.photoHint}</p>
        <input
          ref={fileInputRef}
          id="help-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
        />
        {photoPreview ? (
          <div className="relative overflow-hidden rounded-xl ring-1 ring-orange-500/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="" className="max-h-48 w-full object-contain bg-[#12081a]" />
            <button
              type="button"
              aria-label={copy.photoRemoveAria}
              onClick={clearPhoto}
              className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-orange-100"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full border-orange-400/40 text-orange-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-5" aria-hidden />
            {copy.photoAdd}
          </Button>
        )}
      </div>

      {error ? <p className="text-base text-red-300">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="w-full bg-orange-500 text-lg text-black hover:bg-orange-400"
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            {copy.submitting}
          </>
        ) : (
          copy.submit
        )}
      </Button>
    </form>
  );
}
