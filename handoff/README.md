# Handoff pack for an assistant doing the account setup

This folder exists so another assistant (ChatGPT, or anyone) can do the account-dependent setup without being told things twice. Everything it needs is either in `handoff/facts.json` or at one of the paths below. Nothing in this folder is secret. Secrets only ever go into `.env` files on the owner's computer, which git ignores.

Repository: `https://github.com/JudeBenz/ai-receptionist`
Raw file URL pattern: `https://raw.githubusercontent.com/JudeBenz/ai-receptionist/main/<path>`

## What to read, in order

| Need | Path |
|------|------|
| Every non-secret fact: brand, domain, email to create, numbers, tiers, Google names and headers, DNS records, test calls | `handoff/facts.json` |
| The step-by-step prompt itself | `ops/chatgpt-setup-prompt.md` |
| The `.env` lines that must be filled on the owner's computer | `.env.example` |
| n8n workflow 1 to import (MCP server with 7 tools) | `n8n/receptionist-mcp-server.json` |
| n8n workflow 2 to import (end-of-call logger) | `n8n/end-of-call-logger.json` |
| Google Sheet tabs and exact headers | `n8n/google-sheet-layout.md` |
| How the Vapi assistant gets created (script, run by the owner) | `vapi/setup.mjs` and `README.md` |
| The six test calls and pass/fail criteria | `tests/test-calls.md` |
| The website to host | `site/index.html` (edit the `BRAND` block at the bottom before deploying) |
| Business facts the demo receptionist quotes | `knowledge/business-faq.md` |
| Launch checklist with costs | `business/launch-checklist.md` |
| What to do once a real client signs | `ops/delivery-playbook.md` |

## What to write back

When done, fill `handoff/status.md` (copy `handoff/status-template.md`) with every non-secret value collected and paste it to the owner, or open a pull request if you have repo access. Never write a secret into any file in this repository.
