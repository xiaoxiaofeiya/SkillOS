# Installation

SkillOS can be installed directly from this GitHub repository during the public preview.

There are two layers:

- **Agent-facing layer**: `skills/skillos/SKILL.md`, installable with Agent Skills CLI or Claude Code plugin marketplace.
- **Local runtime layer**: `skillos` CLI and `skillos-mcp-server`, installed with the GitHub bootstrap scripts or from source.

Install both layers when you want agents to automatically know when to use SkillOS and also have working local commands.

## Requirements

- Node.js 20 or newer
- npm
- Git, if installing by clone

## Agent Skill Install

For Codex, Cursor, Copilot, Gemini CLI, Windsurf, and other Agent Skills-compatible hosts:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Update later:

```bash
npx skills update skillos -g
```

For Claude Code plugin marketplace:

```text
/plugin marketplace add xiaoxiaofeiya/SkillOS
/plugin install skillos
```

The agent skill/plugin install teaches the host how to invoke SkillOS. It does not replace the local runtime install below.

## Windows One-Line Runtime Install

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

This clones or updates the repository under `%LOCALAPPDATA%\SkillOS`, installs dependencies, builds the workspace, links commands, and runs setup.

## macOS/Linux One-Line Runtime Install

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

This clones or updates the repository under `~/.local/share/skillos`, installs dependencies, builds the workspace, links commands, and runs setup.

## Windows Quick Install

```powershell
git clone https://github.com/xiaoxiaofeiya/SkillOS.git
cd SkillOS
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

This installs dependencies, builds the workspace, links the `skillos` and `skillos-mcp-server` commands, and runs `skillos setup --safety approve`.

Install without global command linking:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -NoLink
```

Install only selected clients:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Clients "codex,cursor,openclaw"
```

## Windows Bootstrap From A Local Checkout

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-from-github.ps1
```

If running from outside the repository, use the one-line runtime install above.

## macOS/Linux Quick Install

```bash
git clone https://github.com/xiaoxiaofeiya/SkillOS.git
cd SkillOS
bash scripts/install.sh
```

Install without global command linking:

```bash
bash scripts/install.sh --no-link
```

## Manual Install

```bash
npm install
npm run build
npm link
skillos setup --safety approve
skillos doctor
```

If `npm link` is not desired, run the CLI directly:

```bash
node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js setup --safety approve
```

## Configure Clients

Setup writes generated presets to `.skillos/generated-presets/` and shows the planned real client config changes.

Review a client:

```bash
skillos preset diff --client codex
```

Apply after review:

```bash
skillos preset apply --client codex --confirm
```

Supported clients:

- `codex`
- `claude-code`
- `cursor`
- `windsurf`
- `openhands`
- `openclaw`

## Verify

```bash
skillos doctor
skillos inventory
skillos recommend "Make this UI professional and verify it in a browser"
skillos explain --last
```

Use JSON output for agents and scripts:

```bash
skillos doctor --format json
```
