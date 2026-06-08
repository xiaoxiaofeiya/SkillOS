# SkillOS

SkillOS is a local-first skill orchestration layer for coding agents.

It discovers installed skills, turns them into capability cards, recommends staged skill chains, exposes an MCP server, records redacted decisions locally, accepts feedback, runs routing evals, and generates presets for Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like clients.

## Install from GitHub

### Windows

```powershell
git clone https://github.com/xiaoxiaofeiya/SkillOS.git
cd SkillOS
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### macOS/Linux

```bash
git clone https://github.com/xiaoxiaofeiya/SkillOS.git
cd SkillOS
bash scripts/install.sh
```

The installer runs `npm install`, builds the workspace, links the `skillos` and `skillos-mcp-server` commands, and generates local client presets with `skillos setup --safety approve`.

Run without global command linking:

```bash
node scripts/install-local.mjs --no-link
```

More details: [docs/installation.md](docs/installation.md).

## Public Preview Quick Start

```bash
npm install
npm run build
npm link
skillos setup --safety approve
skillos inventory
skillos recommend "Make this UI professional and verify it in a browser"
skillos explain --last
skillos eval run
```

Use `--format json` on any command when another agent or script needs stable machine-readable output.

## What Setup Does

`skillos setup` initializes local `.skillos/` data when needed, renders client presets, writes generated presets to `.skillos/generated-presets/`, and shows planned client config changes.

It does not apply real client config files by default.

Review a client preset:

```bash
skillos preset diff --client codex
```

Apply only after review:

```bash
skillos preset apply --client codex --confirm
```

## Common Commands

```bash
skillos doctor
skillos inventory
skillos recommend "Deploy this app safely"
skillos explain --last
skillos feedback --decision <id> --prefer playwright --avoid vercel-deploy
skillos presets --out dist-presets
skillos pack verify
```

## Packages

- `@skillos/core`: inventory, capability cards, routing, repo signals, safety config, decision logs, feedback memory, and evals.
- `@skillos/adapters`: Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like presets.
- `@skillos/mcp-server`: JSON-RPC stdio MCP server exposing SkillOS tools.
- `@skillos/cli`: CLI for setup, init, inventory, recommend, inspect, eval, doctor, preset diff/apply, feedback, and package verification.

## MCP Tools

The MCP server exposes:

- `inventory_skills`
- `search_skills`
- `inspect_skill`
- `recommend_skill_chain`
- `render_skill_context`
- `record_decision`
- `record_feedback`
- `run_eval`
- `detect_skill_gap`
- `render_client_preset`
- `verify_client_setup`
- `explain_decision`

Tool results use a stable envelope:

```json
{ "ok": true, "version": 1, "data": {} }
```

Errors use:

```json
{ "ok": false, "version": 1, "error": { "code": "example", "message": "..." } }
```

## Safety

SkillOS stores data locally by default and does not upload telemetry.

Safety profiles:

- `suggest`: recommend only.
- `approve`: require confirmation for medium/high-risk work.
- `auto`: allow low/medium-risk work and block high-risk work unless a client policy overrides it.

High-risk actions include deployment, credential use, external private-data sends, auth/security changes, and destructive operations.

## Optional Model Enhancement

Local routing is the default. If `modelEnhancement.enabled` is true and the configured API key environment variable exists, SkillOS can call OpenAI-compatible endpoints for embedding rerank, optional LLM rerank, skill summaries, and failure-review suggestions.

If credentials are missing or a request fails, SkillOS falls back to local routing and records the reason.

## Distribution

Build and verify:

```bash
npm run release:local
```

The zip package excludes `.skillos/`, local logs, credentials, `node_modules`, TypeScript build-info files, and local path metadata.

GitHub Actions builds and uploads `dist/skillos.zip` as a workflow artifact. Tags matching `v*` create a GitHub release with the zip attached.

Release details: [docs/release.md](docs/release.md).
