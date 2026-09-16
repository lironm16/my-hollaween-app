import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

/** Match in-doc anchor links like `#מסך-הבית--מפה-ורשימה`. */
export function guideHeadingId(text: string) {
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

export async function loadUserGuideMarkdown() {
  return readFile(path.join(process.cwd(), "docs/user-guide-he.md"), "utf8");
}

export async function renderUserGuideHtml() {
  const markdown = await loadUserGuideMarkdown();
  return marked.parse(markdown) as string;
}
