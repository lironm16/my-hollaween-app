import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "src/app/globals.css");
const output = join(root, "public/app.css");

const source = readFileSync(input, "utf8");
const result = await postcss([tailwind()]).process(source, { from: input, to: output });
writeFileSync(output, result.css);
console.log(`wrote ${output} (${Buffer.byteLength(result.css)} bytes)`);
