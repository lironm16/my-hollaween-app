import { config } from "@/lib/config";
import type { PushPayload } from "@/lib/push";
import { cn } from "@/lib/utils";

/** Native-looking lock-screen banner: same icon, Hebrew RTL, title + body as the service worker shows. */
export function PushNotice({
  payload,
  time = "עכשיו",
  className,
}: {
  payload: PushPayload;
  time?: string;
  className?: string;
}) {
  return (
    <article
      dir="rtl"
      className={cn(
        "flex gap-3 rounded-[22px] bg-[#3a2a48]/92 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/12 backdrop-blur-md",
        className,
      )}
    >
      {/* Static PWA icon — this is what showNotification uses as icon + badge. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-192.png"
        alt=""
        width={42}
        height={42}
        className="size-[42px] shrink-0 rounded-[10px] ring-1 ring-orange-400/35"
      />
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-medium tracking-wide text-white/65">{config.brandHe}</p>
          <p className="text-[11px] text-white/40">{time}</p>
        </div>
        <p className="mt-0.5 text-[15px] font-semibold leading-snug text-white">{payload.title}</p>
        {payload.body ? (
          <p className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-white/78">{payload.body}</p>
        ) : null}
      </div>
    </article>
  );
}
