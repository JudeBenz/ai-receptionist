// Watch the demo line through the Vapi API from the owner's PC.
// Usage:  node tests/watch-call.mjs            poll until a new call starts, then follow it to the end
//         node tests/watch-call.mjs <call-id>  print one finished call in full
//         node tests/watch-call.mjs --last     print the most recent call in full
// Prints status changes, every tool call with its arguments and result, the transcript and the cost.
// Reads VAPI_API_KEY from .env. Never prints the key.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => /^[A-Z0-9_]+=/.test(l))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const H = { Authorization: `Bearer ${env.VAPI_API_KEY}` };
const api = async (p) => { const r = await fetch(`https://api.vapi.ai${p}`, { headers: H }); if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`); return r.json(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const et = (ms) => ms ? new Date(ms).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false }) : "";

function dump(call) {
  console.log(`\n=== call ${call.id}  status=${call.status}  from=${call.customer?.number ?? "?"}  ended=${call.endedReason ?? ""}`);
  console.log(`    started ${call.startedAt ?? ""}  ended ${call.endedAt ?? ""}  cost $${call.cost ?? "?"}`);
  for (const m of call.messages ?? []) {
    if (m.role === "system") continue;
    const t = et(m.time);
    if (m.role === "tool_calls") {
      for (const tc of m.toolCalls ?? []) console.log(`  [${t}] TOOL      ${tc.function?.name}(${tc.function?.arguments})`);
    } else if (m.role === "tool_call_result") {
      console.log(`  [${t}] RESULT    ${m.name ?? ""}: ${String(m.result ?? "").slice(0, 700)}`);
    } else {
      console.log(`  [${t}] ${String(m.role).padEnd(9)} ${m.message ?? ""}`);
    }
  }
  if (call.analysis?.summary) console.log(`  SUMMARY: ${call.analysis.summary}`);
}

const arg = process.argv[2];
if (arg === "--last") { const [c] = await api("/call?limit=1"); dump(await api(`/call/${c.id}`)); process.exit(0); }
if (arg) { dump(await api(`/call/${arg}`)); process.exit(0); }

const known = new Set((await api("/call?limit=10")).map(c => c.id));
console.log(`Watching +1 (978) 347-8475 ... (${known.size} earlier calls ignored). Place the call now.`);
let id = null, lastStatus = "";
while (!id) {
  await sleep(3000);
  for (const c of await api("/call?limit=3")) if (!known.has(c.id)) id = c.id;
}
console.log(`New call ${id}`);
while (true) {
  const c = await api(`/call/${id}`);
  if (c.status !== lastStatus) { lastStatus = c.status; console.log(`  status -> ${c.status}  ${et(Date.now())}`); }
  if (c.status === "ended") { await sleep(8000); dump(await api(`/call/${id}`)); break; }
  await sleep(4000);
}
