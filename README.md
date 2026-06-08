# SkillOS

SkillOS is a local-first skill orchestration layer for coding agents.

It discovers installed skills, turns them into capability cards, recommends staged skill chains, exposes an MCP server, records redacted decisions locally, accepts feedback, runs routing evals, and generates presets for Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like clients.

## What SkillOS Is For

Modern coding agents can use skills, MCP servers, plugins, hooks, rules, workflows, and local tools. The hard part is not only installing them. The hard part is helping the agent notice the right capability at the right phase of a messy real task, explain why it chose it, and avoid loading every tool into context.

SkillOS is built for that gap. It gives agents a local operating layer for skills:

- It inventories what is installed on this machine.
- It converts skills and tools into structured capability cards.
- It routes vague user requests such as "make this app usable", "is this safe", or "put it online" into likely work domains.
- It plans multi-step skill chains instead of choosing one skill at a time.
- It re-checks skill needs across intake, repo inspection, implementation, verification, deployment, security review, and final response.
- It records local, redacted decision traces so users can inspect and correct routing behavior.
- It generates client-specific presets for the agent environments people actually use.

The goal is to make installed skills feel less like a passive menu and more like an adaptive local workflow system.

## Typical Use Cases

Use SkillOS when you want an agent to decide which specialized capabilities to use without requiring the user to know their names.

| User says | SkillOS should help the agent do |
| --- | --- |
| "I do not know UI design. Make this page professional." | Route to UI/design, implementation, browser testing, screenshot QA, and possibly security checks. |
| "Deploy this app, but do not break anything." | Inspect repo signals, choose deployment capabilities if installed, recommend smoke tests, and flag credential or public-exposure risk. |
| "Is this login/upload/API safe?" | Route to security review or threat modeling, explain risk, and keep high-risk actions behind the configured safety profile. |
| "Make a CLI for this repeated task." | Route to CLI creation, command contract design, local smoke tests, and a companion skill workflow. |
| "I installed new skills. Use whatever makes sense." | Re-inventory local capabilities and update recommendations without changing SkillOS code. |

## How It Works

```text
User task
  -> local inventory
  -> capability cards
  -> repo and phase signals
  -> safety gate
  -> ranked candidates
  -> staged skill chain
  -> decision log and feedback memory
```

SkillOS does not blindly load all skills. It selects the smallest chain that appears useful for the current task and phase, then explains selected and skipped candidates.

## What SkillOS Is Not

- It is not only an installer. The installer is just how the agent-facing skill and local runtime get onto the machine.
- It is not a cloud telemetry service. Local routing and local logs are the default.
- It is not a replacement for Codex, Claude Code, Cursor, Windsurf, OpenHands, or OpenClaw. It is a shared orchestration layer that can generate presets for them.
- It does not make risky actions invisible. Deployment, credential use, external private-data sends, auth/security changes, and destructive operations are handled by safety profiles.

For a fuller product explanation, read [docs/product-overview.md](docs/product-overview.md).

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
