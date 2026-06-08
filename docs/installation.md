# Installation

SkillOS can be installed directly from this GitHub repository during the public preview.

## Requirements

- Node.js 20 or newer
- npm
- Git, if installing by clone

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

## Windows One-Step GitHub Bootstrap

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-from-github.ps1
```

If running from outside the repository, download `scripts/install-from-github.ps1` first or run it from a cloned checkout.

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
