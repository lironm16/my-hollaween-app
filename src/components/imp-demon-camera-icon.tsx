import { cn } from "@/lib/utils";

/** Demon head + viewfinder — launches gem hunt / camera (user reference art). */
export function ImpDemonCameraIcon({
  className,
  signalActive = false,
}: {
  className?: string;
  /** Pulse when within hunt range of a visible uncollected gem. */
  signalActive?: boolean;
}) {
  return (
    <span
      className={cn(
        "imp-demon-camera-icon inline-flex size-8 shrink-0 items-center justify-center overflow-hidden",
        signalActive && "is-signal-active",
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/demon-camera-hunt.png"
        alt=""
        className="size-[92%] max-h-full max-w-full object-contain object-center"
        decoding="async"
      />
    </span>
  );
}
