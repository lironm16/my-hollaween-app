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
    <span
      className={cn(pinGlyphClass(kind), className)}
      style={{ ["--pin-glyph-mask" as string]: `url('${src}')` }}
      aria-hidden
    />
  );
}
