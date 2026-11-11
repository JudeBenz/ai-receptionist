# clients/

One folder per client, created with `node scripts/new-client.mjs "<Client Name>"`. The folder is the single source of truth for that client's receptionist.

```
clients/<slug>/
  business.json        facts the prompt and tools are rendered from
  business-faq.md      the only things the receptionist may quote
  .env                 that client's ids and URLs (git-ignored)
  .env.example         what .env needs
  n8n/                 generated workflow files for import (from scripts/n8n-for-client.mjs)
  notes.md             kickoff notes, change log, test results
```

`clients/_template/` is the starting point. Never put a real client's `.env` in git.

Commands, in order:

```bash
node scripts/new-client.mjs "Acme Plumbing"
```

```bash
node scripts/n8n-for-client.mjs acme-plumbing
```

```bash
node vapi/setup.mjs --client acme-plumbing
```

Later changes to the FAQ or prompt:

```bash
node vapi/setup.mjs --client acme-plumbing --update
```
