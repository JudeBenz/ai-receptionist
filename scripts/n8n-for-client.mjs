#!/usr/bin/env node
// Generate a client's two n8n workflow files from the base templates in n8n/.
//   node scripts/n8n-for-client.mjs <slug>
// Reads clients/<slug>/business.json. Writes clients/<slug>/n8n/receptionist-mcp-server.json
// and clients/<slug>/n8n/end-of-call-logger.json with:
//   - the MCP trigger path and webhook path suffixed with the slug (so clients never share a URL)
//   - workflow names carrying the client name
//   - the calendar id, sheet id and tab names prefilled when business.json has them
// Credentials are still picked in the n8n UI after import.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/n8n-for-client.mjs <slug>'); process.exit(1); }
const clientDir = resolve(root, 'clients', slug);
if (!existsSync(clientDir)) { console.error(`No clients/${slug}. Run scripts/new-client.mjs first.`); process.exit(1); }

const cfg = JSON.parse(readFileSync(resolve(clientDir, 'business.json'), 'utf8'));
const g = cfg.google || {};
const name = cfg.business?.name || slug;
const outDir = resolve(clientDir, 'n8n');
mkdirSync(outDir, { recursive: true });

function locator(value, mode) {
  return value ? { __rl: true, mode, value } : { __rl: true, mode: 'list', value: '' };
}

function rewrite(wf, kind) {
  wf.name = `${wf.name} · ${name}`;
  for (const node of wf.nodes) {
    const p = node.parameters || {};
    if (node.type === '@n8n/n8n-nodes-langchain.mcpTrigger') p.path = `receptionist-${slug}`;
    if (node.type === 'n8n-nodes-base.webhook') p.path = `vapi-end-of-call-${slug}`;
    if ('calendar' in p) p.calendar = locator(g.calendar_id, 'id');
    if ('documentId' in p) {
      p.documentId = locator(g.sheet_id, 'id');
      const tab = kind === 'logger' ? (g.calllog_tab || 'CallLog') : (g.clients_tab || 'Clients');
      p.sheetName = locator(tab, 'name');
    }
    if (node.type === 'n8n-nodes-base.gmail' && cfg.contact?.owner_email) {
      p.sendTo = cfg.contact.owner_email;
    }
  }
  wf.meta = { ...(wf.meta || {}), instanceId: 'import', client: slug };
  return wf;
}

const files = [
  ['receptionist-mcp-server.json', 'mcp'],
  ['end-of-call-logger.json', 'logger'],
];
for (const [file, kind] of files) {
  const wf = JSON.parse(readFileSync(resolve(root, 'n8n', file), 'utf8'));
  const out = rewrite(wf, kind);
  writeFileSync(resolve(outDir, file), JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote clients/${slug}/n8n/${file}`);
}

console.log('');
console.log('Import both files in n8n, then in each: pick the Google credential (and Gmail on the logger),');
console.log(`create a Bearer Auth credential on the MCP trigger, activate, and copy the two production URLs into clients/${slug}/.env.`);
if (!g.calendar_id || !g.sheet_id) console.log('Calendar id or sheet id missing in business.json: you will pick them by hand in each node.');
