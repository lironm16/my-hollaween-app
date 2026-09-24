import { Fragment, type ReactNode } from "react";
import { HelpUiChip } from "@/components/help-ui-chip";

const CHIP_PATTERN = /<<([^>]+)>>/g;
const INLINE_PATTERN = /<<([^>]+)>>|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function containsChipMarkers(text: string): boolean {
  CHIP_PATTERN.lastIndex = 0;
  return CHIP_PATTERN.test(text);
}

function renderLine(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      parts.push(<HelpUiChip key={`${keyPrefix}-${key++}`}>{match[1]}</HelpUiChip>);
    } else if (match[2] !== undefined) {
      parts.push(
        <strong key={`${keyPrefix}-${key++}`} className="text-orange-200">
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${keyPrefix}-${key++}`}>{match[3]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];

  return <Fragment>{parts}</Fragment>;
}

/** Split copy on `<<label>>` markers (and optional **strong** / *em*) and render UI labels as inline chips. */
export function renderHelpText(text: string): ReactNode {
  const lines = text.split("\n");
  if (lines.length === 1) return renderLine(text, "line");

  return (
    <Fragment>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? <br /> : null}
          {renderLine(line, `line-${index}`)}
        </Fragment>
      ))}
    </Fragment>
  );
}

/** App-wide helper: auto-parses string children for <<ui-label>> chips; passes ReactNode through unchanged. */
export function HelpText({ children }: { children: ReactNode }) {
  if (typeof children === "string") return renderHelpText(children);
  return children;
}
