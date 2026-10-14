import { pinGlyphClass, type PinGlyphKind } from "@/lib/pin-glyph-html";
import { cn } from "@/lib/utils";

export function PinGlyph({
  src,
  kind,
  className,
}: {
  src: string;
  kind: PinGlyphKind;
  className?: string;
}) {
  return (
    <span className={cn("pin-glyph-stack", className)} aria-hidden>
      <span
        className={pinGlyphClass(kind)}
        style={{ ["--pin-glyph-mask" as string]: `url('${src}')` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pin-glyph-faces" src={src} alt="" decoding="async" />
    </span>
  );
}
