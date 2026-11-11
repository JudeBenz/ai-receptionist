#!/usr/bin/env node
// Scaffold a client folder from clients/_template.
//   node scripts/new-client.mjs "Acme Plumbing"            -> clients/acme-plumbing/
//   node scripts/new-client.mjs "Acme Plumbing" --slug acme -> clients/acme/

import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const name = argv.find(a => !a.startsWith('--'));
if (!name) { console.error('Usage: node scripts/new-client.mjs "Client Name" [--slug slug]'); process.exit(1); }
const slugIdx = argv.indexOf('--slug');
const slug = (slugIdx > -1 ? argv[slugIdx + 1] : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) { console.error(`Bad slug "${slug}": letters, digits and hyphens only.`); process.exit(1); }

const src = resolve(root, 'clients', '_template');
const dest = resolve(root, 'clients', slug);
if (existsSync(dest)) { console.error(`clients/${slug} already exists. Pick another --slug or edit that folder.`); process.exit(1); }

cpSync(src, dest, { recursive: true });

// Replace the template name and slug in the text files.
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(json|md|example)$/.test(f)) {
      const t = readFileSync(p, 'utf8').replaceAll('Client Business Name', name).replaceAll('client-slug', slug);
      writeFileSync(p, t);
    }
  }
}
walk(dest);

console.log(`Created clients/${slug}/ for "${name}".`);
console.log('Next:');
console.log(`  1. Fill clients/${slug}/business.json and business-faq.md from the kickoff questionnaire.`);
console.log(`  2. Create the Google calendar and sheet; put their ids in business.json (google.calendar_id, google.sheet_id).`);
console.log(`  3. node scripts/n8n-for-client.mjs ${slug}   -> import clients/${slug}/n8n/*.json into n8n`);
console.log(`  4. cp clients/${slug}/.env.example clients/${slug}/.env and fill the n8n URLs and token.`);
console.log(`  5. node vapi/setup.mjs --client ${slug}`);
