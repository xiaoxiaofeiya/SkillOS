# SkillOS

**Give your coding agent a mission control for every skill you install.**

Languages: [English](README.md) | [简体中文](docs/i18n/zh-CN/README.md) | [日本語](docs/i18n/ja/README.md) | [한국어](docs/i18n/ko/README.md) | [Español](docs/i18n/es/README.md) | [Français](docs/i18n/fr/README.md)

Your coding agent can design UI, test in a browser, deploy apps, review security, read docs, build CLIs, run notebooks, and call MCP tools. The problem is simple: the more powers you install, the easier it is for the agent to miss the right one.

SkillOS fixes that. It helps the agent notice what is installed, understand what each capability is for, choose the right chain of skills, explain the choice, and keep risky actions under your safety rules.

You do not need to remember whether the right tool is called `playwright`, `security-threat-model`, `vercel-deploy`, `jupyter-notebook`, or something else. Say what you want. SkillOS helps the agent translate that request into a real workflow.

## The Promise

SkillOS turns a folder full of skills into an agent that feels prepared.

- **For beginners**: ask in plain language. The agent should figure out the skill names.
- **For builders**: connect skills, MCP tools, rules, plugins, hooks, and client presets without hardcoding every case.
- **For teams**: keep decisions local, explainable, testable, and safer by default.
- **For new skills**: install them once, then let inventory and routing discover them next time.

## What This Feels Like

You say:

```text
I do not know UI design. Make this dashboard look professional and check it.
```

SkillOS helps the agent think:

```text
This is not one task.
It needs UI judgment, implementation, browser verification,
screenshot QA, and maybe a security check before delivery.
```

Then it recommends a staged chain instead of guessing one random tool.

Another example:

```text
Deploy this app, but do not break anything.
```

SkillOS can inspect the repo, look for installed deployment skills, add verification steps, flag credential risk, and explain what it selected or skipped.

## Why Now

The agent market is moving fast. Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, MCP, and the Agent Skills ecosystem are all adding ways to package specialized capabilities. That is powerful, but it creates a new problem: someone has to decide which capability to use, when to use it, and how to combine it with the next step.

SkillOS is built for that missing layer.

Read the market notes in [docs/market-context.md](docs/market-context.md), then read the full product explanation in [docs/product-overview.md](docs/product-overview.md).

## Install

SkillOS has two install layers:

- **Agent Skill / plugin entry**: teaches your agent when and how to call SkillOS.
- **Local runtime**: installs the `skillos` CLI and `skillos-mcp-server`.

For the best experience, install both.

| Surface | Install | Update |
| --- | --- | --- |
| Agent Skills hosts: Codex, Cursor, Gemini CLI, Copilot, Windsurf, and others | `npx skills add xiaoxiaofeiya/SkillOS -g` | `npx skills update skillos -g` |
| Claude Code plugin marketplace | `/plugin marketplace add xiaoxiaofeiya/SkillOS` then `/plugin install skillos` | `/plugin update skillos` |
| Windows runtime | Use the PowerShell command below | Run the same command again |
| macOS/Linux runtime | Use the shell command below | Run the same command again |
| GitHub source install | Clone the repo, then run `scripts/install.ps1` or `scripts/install.sh` | `git pull --ff-only`, then rerun the installer |
| Zip preview package | Download `skillos.zip`, extract, then run `npm run install:local` | Download the latest zip |

More details: [docs/distribution.md](docs/distribution.md) and [docs/installation.md](docs/installation.md).

## Quick Start

Install the agent-facing skill:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Install the local runtime on Windows:

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

Install the local runtime on macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

Then run:

```bash
skillos doctor
skillos setup --safety approve
skillos inventory
skillos recommend "Make this UI professional and verify it in a browser"
skillos explain --last
```

On Windows PowerShell, use `skillos.cmd` instead of `skillos` if execution policy blocks npm-generated `.ps1` shims:

```powershell
skillos.cmd doctor
```

Use `--format json` on any command when another agent or script needs stable machine-readable output.

## Verified Install Paths

This repository includes an isolated install verifier:

```bash
npm run verify:install
```

It tests the local Agent Skills path, local runtime install, linked commands with a temporary npm prefix, zip extraction, CLI smoke tests, and Claude marketplace metadata without writing to your real global skill or client configuration.

Network-dependent checks are separate:

```bash
npm run verify:install:network
```

If GitHub clone or remote `npx skills add xiaoxiaofeiya/SkillOS` fails because of a reset, timeout, proxy, or TLS issue, use the source install or the release zip path below. The runtime and agent-facing skill are separate layers; `npx skills add` installs the agent entry, while the runtime installer provides the `skillos` and `skillos-mcp-server` commands.

## Install from Source

### Windows Source Install

```powershell
git clone https://github.com/xiaoxiaofeiya/SkillOS.git
cd SkillOS
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### macOS/Linux Source Install

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

The zip package excludes `.skillos/`, local logs, credentials, `node_modules`, TypeScript build-info files, and local path metadata. `release:local` also runs isolated installation verification.

GitHub Actions builds and uploads `dist/skillos.zip` as a workflow artifact. Tags matching `v*` create a GitHub release with the zip attached.

Release details: [docs/release.md](docs/release.md).
