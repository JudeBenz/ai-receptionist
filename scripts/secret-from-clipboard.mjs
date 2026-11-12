#!/usr/bin/env node
// Moves a secret from the Windows clipboard into .env without ever showing it.
//   node scripts/secret-from-clipboard.mjs N8N_API_KEY
// Copy the secret first, then run this. It prints only the name and the length,
// replaces an existing line of the same name, and then empties the clipboard.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const name = process.argv[2];
if (!/^[A-Z][A-Z0-9_]*$/.test(name || "")) { console.error("Usage: node scripts/secret-from-clipboard.mjs NAME_IN_CAPITALS"); process.exit(1); }

const ps = (cmd) => execFileSync("powershell.exe", ["-NoProfile", "-Command", cmd], { encoding: "utf8" });
const value = ps("Get-Clipboard -Raw").trim();
if (!value) { console.error("The clipboard is empty. Copy the key first, then run this again."); process.exit(1); }
if (/\s/.test(value)) { console.error("The clipboard holds text with spaces or line breaks, so it does not look like a key. Nothing was saved."); process.exit(1); }

const envPath = new URL("../.env", import.meta.url);
const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
const i = lines.findIndex(l => l.startsWith(name + "="));
if (i >= 0) lines[i] = `${name}=${value}`; else { while (lines.length && lines[lines.length - 1] === "") lines.pop(); lines.push(`${name}=${value}`, ""); }
fs.writeFileSync(envPath, lines.join("\n"));
ps("Set-Clipboard -Value ' '");
console.log(`${name} saved to .env (${value.length} characters). The clipboard has been cleared.`);
