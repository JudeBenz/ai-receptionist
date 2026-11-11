#!/usr/bin/env node
// Creates (or updates) the Vapi assistant from config/business.json, prompts/system-prompt.md
// and knowledge/business-faq.md. Needs Node 18+ (uses global fetch, FormData and Blob).
//
//   node vapi/setup.mjs                      create the demo assistant from config/ and knowledge/
//   node vapi/setup.mjs --client <slug>      create a client's assistant from clients/<slug>/
//   node vapi/setup.mjs [--client x] --update   update the assistant whose id is in the .env in use
//   node vapi/setup.mjs [--client x] --dry-run  print the payload and exit without calling Vapi
//
// Secrets come from .env at the repo root (VAPI_API_KEY) and, with --client, from clients/<slug>/.env,
// which overrides the root values. Nothing is hard-coded.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const clientIdx = argv.indexOf('--client');
const client = clientIdx > -1 ? argv[clientIdx + 1] : null;
if (clientIdx > -1 && (!client || client.startsWith('--'))) { console.error('--client needs a slug'); process.exit(1); }
const clientDir = client ? resolve(root, 'clients', client) : null;
if (clientDir && !existsSync(clientDir)) { console.error(`No clients/${client}. Run scripts/new-client.mjs first.`); process.exit(1); }
const args = new Set(argv.filter(a => a.startsWith('--')));
const API = 'https://api.vapi.ai';

// ---------- .env ----------
function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}
const env = {
  ...loadEnv(resolve(root, '.env')),
  ...(clientDir ? loadEnv(resolve(clientDir, '.env')) : {}),
  ...process.env,
};

function need(name) {
  if (!env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return env[name];
}

// ---------- config and prompt ----------
const configPath = clientDir ? resolve(clientDir, 'business.json') : resolve(root, 'config/business.json');
const faqPath = clientDir ? resolve(clientDir, 'business-faq.md') : resolve(root, 'knowledge/business-faq.md');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const promptTemplate = readFileSync(resolve(root, 'prompts/system-prompt.md'), 'utf8');
// A client's business.json can carry the transfer number and owner email; a .env value still wins.
if (!env.TRANSFER_NUMBER && config.phone?.transfer_number && config.phone.transfer_number.length > 3) env.TRANSFER_NUMBER = config.phone.transfer_number;
if (!env.OWNER_EMAIL && config.contact?.owner_email) env.OWNER_EMAIL = config.contact.owner_email;
console.log(client ? `Client: ${client} (${configPath})` : `Demo assistant (${configPath})`);

function lookup(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
// [[a.b.c]] tokens are ours; {{ ... }} is left alone for Vapi's own templating.
const systemPrompt = promptTemplate.replace(/\[\[([a-zA-Z0-9_.]+)\]\]/g, (m, key) => {
  const v = lookup(config, key);
  if (v === undefined) {
    console.error(`Prompt token ${m} has no value in config/business.json`);
    process.exit(1);
  }
  return String(v);
});

const b = config.business;
const firstMessage =
  `Thanks for calling ${b.name}. This is ${config.assistant_name}, an AI assistant, ` +
  `and this call may be recorded. How can I help you today?`;

// ---------- knowledge file upload ----------
async function uploadFaq(apiKey) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(faqPath)], { type: 'text/markdown' }), `${client || 'demo'}-business-faq.md`);
  const res = await fetch(`${API}/file`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!res.ok) throw new Error(`File upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.id;
}

// ---------- assistant payload ----------
function buildPayload({ fileId }) {
  const tools = [
    {
      type: 'mcp',
      server: {
        url: need('N8N_MCP_URL'),
        headers: { Authorization: `Bearer ${need('N8N_MCP_TOKEN')}` },
      },
      metadata: { protocol: env.N8N_MCP_PROTOCOL || 'sse' },
    },
    {
      type: 'transferCall',
      destinations: [
        {
          type: 'number',
          number: need('TRANSFER_NUMBER'),
          message: "I'll transfer you to the team now, one moment.",
          description: 'Use when the caller asks for a person, is upset, or needs something outside the call flow, during business hours.',
        },
      ],
    },
    { type: 'endCall' },
  ];
  if (fileId) {
    tools.push({
      type: 'query',
      function: { name: 'search_business_info' },
      knowledgeBases: [
        {
          provider: 'google',
          name: 'business-faq',
          description: 'Hours, services, price ranges, service area, scheduling and payment policies. Use for any question about the business.',
          fileIds: [fileId],
        },
      ],
    });
  }

  const payload = {
    name: `${b.name} receptionist`,
    firstMessage,
    firstMessageMode: 'assistant-speaks-first',
    transcriber: { provider: 'deepgram', model: 'nova-3', language: 'en' },
    model: {
      provider: 'openai',
      model: 'gpt-4.1',
      temperature: 0.3,
      maxTokens: 300,
      messages: [{ role: 'system', content: systemPrompt }],
      tools,
    },
    voice: { provider: 'vapi', voiceId: config.voice_id || 'Paige' },
    serverMessages: ['end-of-call-report'],
    analysisPlan: {
      summaryPlan: {
        enabled: true,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert note-taker for a small business owner. Summarise the call in two or three plain sentences: who called, what they needed, and what was agreed or booked. Mention anything the owner must do next.',
          },
          { role: 'user', content: 'Here is the transcript:\n\n{{transcript}}\n\n. Here is the ended reason of the call:\n\n{{endedReason}}\n\n' },
        ],
      },
      structuredDataPlan: {
        enabled: true,
        schema: {
          type: 'object',
          properties: {
            outcome: {
              type: 'string',
              description: 'What happened on the call',
              enum: ['appointment_booked', 'appointment_rescheduled', 'appointment_cancelled', 'question_answered', 'message_taken', 'transferred', 'no_action'],
            },
            caller_name: { type: 'string', description: 'Caller full name if given, else empty' },
            callback_number: { type: 'string', description: 'Best callback number if given, else empty' },
            follow_up_needed: { type: 'boolean', description: 'True if a human must call back or do something' },
          },
          required: ['outcome', 'follow_up_needed'],
        },
      },
    },
    metadata: { owner_email: env.OWNER_EMAIL || '' },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 900,
    backgroundSound: 'off',
    endCallMessage: `Thanks for calling ${b.name}. Goodbye.`,
  };

  if (env.VAPI_SERVER_URL) {
    payload.server = { url: env.VAPI_SERVER_URL };
    if (env.VAPI_SERVER_SECRET) payload.server.secret = env.VAPI_SERVER_SECRET;
  }
  return payload;
}

// ---------- main ----------
async function main() {
  const dryRun = args.has('--dry-run');
  const update = args.has('--update');
  const apiKey = dryRun ? env.VAPI_API_KEY || 'dry-run' : need('VAPI_API_KEY');

  let fileId = env.VAPI_FAQ_FILE_ID || null;
  if (!dryRun && !fileId) {
    console.log(`Uploading ${faqPath} ...`);
    fileId = await uploadFaq(apiKey);
    console.log(`  file id ${fileId}  (put VAPI_FAQ_FILE_ID=${fileId} in ${client ? `clients/${client}/.env` : '.env'} to reuse it)`);
  }

  const payload = buildPayload({ fileId });
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const url = update ? `${API}/assistant/${need('VAPI_ASSISTANT_ID')}` : `${API}/assistant`;
  const method = update ? 'PATCH' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Vapi ${method} ${url} failed: ${res.status}\n${text}`);
    process.exit(1);
  }
  const assistant = JSON.parse(text);
  console.log(`${update ? 'Updated' : 'Created'} assistant ${assistant.id}`);
  console.log(`Open it: https://dashboard.vapi.ai/assistants/${assistant.id}`);
  if (!update) console.log(`Add VAPI_ASSISTANT_ID=${assistant.id} to ${client ? `clients/${client}/.env` : '.env'} so --update works.`);
  console.log('Next: Dashboard > Phone Numbers > create a number > Inbound settings > choose this assistant,');
  console.log(`      and set its fallback destination to the hand-over number (${env.TRANSFER_NUMBER}).`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
