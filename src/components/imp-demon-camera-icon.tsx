import { cn } from "@/lib/utils";

/** Demon head + viewfinder — launches gem hunt / camera (user reference art). */
export function ImpDemonCameraIcon({
  className,
  signalActive = false,
  variant = "default",
}: {
  className?: string;
  /** Pulse when within hunt range of a visible uncollected gem. */
  signalActive?: boolean;
  /** `fab` / `quick` fill the control like HousePlus / heart icons. */
  variant?: "default" | "quick" | "fab";
}) {
  return (
    <span
      className={cn(
        "imp-demon-camera-icon inline-flex shrink-0 items-center justify-center",
        variant === "default" && "size-8",
        variant === "quick" && "size-8 max-h-full max-w-full",
        variant === "fab" && "size-8",
        signalActive && "is-signal-active",
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/demon-camera-hunt.png"
        alt=""
        className={cn(
          "object-contain object-center",
          variant === "default" && "size-full max-h-full max-w-full",
          (variant === "quick" || variant === "fab") && "imp-demon-camera-icon__fill",
        )}
        decoding="async"
      />
    </span>
  );
}
