# SkillOS

SkillOS is a local-first skill orchestration layer for coding agents.

It discovers installed skills, turns them into capability cards, recommends staged skill chains, exposes an MCP server, records redacted decisions locally, accepts feedback, runs routing evals, and generates presets for Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like clients.

## Public Preview Quick Start

```bash
npm install
npm run build
node packages/cli/dist/index.js setup --safety approve
node packages/cli/dist/index.js inventory
node packages/cli/dist/index.js recommend "Make this UI professional and verify it in a browser"
node packages/cli/dist/index.js explain --last
node packages/cli/dist/index.js eval run
```

Use `--format json` on any command when another agent or script needs stable machine-readable output.

## What Setup Does

`skillos setup` initializes local `.skillos/` data when needed, renders client presets, writes generated presets to `.skillos/generated-presets/`, and shows planned client config changes.

It does not apply real client config files by default.

Review a client preset:

```bash
node packages/cli/dist/index.js preset diff --client codex
```

Apply only after review:

```bash
node packages/cli/dist/index.js preset apply --client codex --confirm
```

## Common Commands

```bash
node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js inventory
node packages/cli/dist/index.js recommend "Deploy this app safely"
node packages/cli/dist/index.js explain --last
node packages/cli/dist/index.js feedback --decision <id> --prefer playwright --avoid vercel-deploy
node packages/cli/dist/index.js presets --out dist-presets
node packages/cli/dist/index.js pack verify
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
npm test
npm run pack:zip
node packages/cli/dist/index.js pack verify
npm run pack:npm
```

The zip package excludes `.skillos/`, local logs, credentials, `node_modules`, TypeScript build-info files, and local path metadata.
