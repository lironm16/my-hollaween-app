import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function guideHeadingId(text) {
  return text
    .trim()
    .replace(/[?!.:]/g, "")
    .replace(/—/g, "--")
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "");
}

const renderer = new marked.Renderer();
renderer.heading = ({ text, depth }) => {
  const id = guideHeadingId(text);
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

marked.use({ renderer, gfm: true });

const markdown = readFileSync(join(root, "docs/user-guide-he.md"), "utf8");
const body = marked.parse(markdown);

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>מדריך משתמש — הלואין בשכונה</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #12081a;
      --panel: #1d1028;
      --text: #f3e8ff;
      --muted: #c4b5fd;
      --accent: #fb923c;
      --border: rgba(251, 146, 60, 0.25);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 1.05rem;
      line-height: 1.65;
    }
    .wrap { max-width: 42rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
    .top {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;
      justify-content: space-between; margin-bottom: 1.5rem;
      padding-bottom: 1rem; border-bottom: 1px solid var(--border);
    }
    .top a.app-link {
      color: var(--accent); text-decoration: none; font-weight: 600;
      padding: 0.5rem 0.9rem; border: 1px solid var(--border); border-radius: 0.75rem;
    }
    .user-guide h1 {
      font-size: 1.75rem; color: var(--accent); margin: 0 0 0.75rem;
    }
    .user-guide h2 {
      font-size: 1.35rem; color: var(--accent); margin: 2rem 0 0.75rem;
      padding-top: 1rem; border-top: 1px solid var(--border);
    }
    .user-guide h3 {
      font-size: 1.1rem; color: #fde68a; margin: 1.25rem 0 0.5rem;
    }
    .user-guide p { margin: 0.6rem 0; color: var(--text); }
    .user-guide ul, .user-guide ol { margin: 0.5rem 0 0.75rem; padding-inline-start: 1.25rem; }
    .user-guide li { margin: 0.25rem 0; }
    .user-guide a { color: var(--accent); text-underline-offset: 2px; }
    .user-guide strong { color: #ffedd5; }
    .user-guide hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
    .user-guide table {
      width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem;
      font-size: 0.98rem; background: var(--panel); border-radius: 0.75rem; overflow: hidden;
    }
    .user-guide th, .user-guide td {
      border: 1px solid var(--border); padding: 0.55rem 0.65rem; text-align: start; vertical-align: top;
    }
    .user-guide th { background: #241332; color: #fde68a; }
    .user-guide code, .user-guide pre {
      font-family: ui-monospace, monospace; font-size: 0.92em;
      background: #241332; border-radius: 0.35rem;
    }
    .user-guide code { padding: 0.1rem 0.35rem; }
    .user-guide pre {
      padding: 0.75rem; overflow-x: auto; border: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <span style="color: var(--muted); font-size: 0.95rem;">HallowHood · הלואין בשכונה</span>
      <a class="app-link" href="/">חזרה לאפליקציה</a>
    </div>
    <article class="user-guide">${body}</article>
  </div>
</body>
</html>
`;

writeFileSync(join(root, "public/guide.html"), html);
console.log("wrote public/guide.html");
