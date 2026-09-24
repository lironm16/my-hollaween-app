import { Fragment, type ReactNode } from "react";
import { HelpUiChip } from "@/components/help-ui-chip";

const CHIP_PATTERN = /<<([^>]+)>>/g;

function renderLine(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CHIP_PATTERN.lastIndex = 0;
  while ((match = CHIP_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<HelpUiChip key={`${keyPrefix}-${key++}`}>{match[1]}</HelpUiChip>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];

  return <Fragment>{parts}</Fragment>;
}

/** Split help copy on `<<label>>` markers and render UI labels as inline chips. */
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
