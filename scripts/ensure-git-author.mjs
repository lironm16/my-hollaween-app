#!/usr/bin/env node
/** Keep commit author valid for Vercel Git deploys in Cloud Agent environments. */
import { execSync } from "node:child_process";

const wantedEmail = process.env.GIT_AUTHOR_EMAIL?.trim() || "lironm16@gmail.com";
const wantedName = process.env.GIT_AUTHOR_NAME?.trim() || "Liron Matitiyahu";

function read(key) {
  try {
    return execSync(`git config ${key}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const email = read("user.email");
if (!email || email.includes("cursor.com") || email.includes("cursoragent")) {
  execSync(`git config user.email ${JSON.stringify(wantedEmail)}`);
  execSync(`git config user.name ${JSON.stringify(wantedName)}`);
}
