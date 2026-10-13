import { Fragment, type ReactNode } from "react";

const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

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
      parts.push(
        <strong key={`${keyPrefix}-${key++}`} className="text-orange-200">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      parts.push(<em key={`${keyPrefix}-${key++}`}>{match[2]}</em>);
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

/** Split copy on optional **strong** / *em* markers. */
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

/** App-wide helper: auto-parses string children for emphasis; passes ReactNode through unchanged. */
export function HelpText({ children }: { children: ReactNode }) {
  if (typeof children === "string") return renderHelpText(children);
  return children;
}
