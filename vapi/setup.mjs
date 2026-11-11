#!/usr/bin/env node
// Creates (or updates) the Vapi assistant from config/business.json, prompts/system-prompt.md
// and knowledge/business-faq.md. Needs Node 18+ (uses global fetch, FormData and Blob).
//
//   node vapi/setup.mjs            create a new assistant, print its id
//   node vapi/setup.mjs --update   update the assistant whose id is in .env (VAPI_ASSISTANT_ID)
//   node vapi/setup.mjs --dry-run  print the payload and exit without calling Vapi
//
// Secrets come from .env next to this folder (see .env.example). Nothing is hard-coded.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
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
const env = { ...loadEnv(resolve(root, '.env')), ...process.env };

function need(name) {
  if (!env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return env[name];
}

// ---------- config and prompt ----------
const config = JSON.parse(readFileSync(resolve(root, 'config/business.json'), 'utf8'));
const promptTemplate = readFileSync(resolve(root, 'prompts/system-prompt.md'), 'utf8');

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
  const path = resolve(root, 'knowledge/business-faq.md');
  const form = new FormData();
  form.append('file', new Blob([readFileSync(path)], { type: 'text/markdown' }), 'business-faq.md');
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
    console.log('Uploading knowledge/business-faq.md ...');
    fileId = await uploadFaq(apiKey);
    console.log(`  file id ${fileId}  (put VAPI_FAQ_FILE_ID=${fileId} in .env to reuse it)`);
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
  if (!update) console.log(`Add VAPI_ASSISTANT_ID=${assistant.id} to .env so --update works.`);
  console.log('Next: Dashboard > Phone Numbers > create a free number > Inbound settings > choose this assistant.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
