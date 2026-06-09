# SkillOS Distribution Guide

For product context before packaging or installing, read [Product Overview](product-overview.md), [Market Context](market-context.md), and [Publishing Platforms](publishing-platforms.md). Language options are available in [Languages](languages.md).

SkillOS is distributed in two layers:

1. **Agent-facing skill/plugin layer**: installs `skills/skillos/SKILL.md`, so an agent knows when and how to call SkillOS.
2. **Local runtime layer**: installs the TypeScript/Node CLI and MCP server that provide `skillos` and `skillos-mcp-server`.

This separation matters. `npx skills add xiaoxiaofeiya/SkillOS -g` installs the agent entry point. The runtime installer installs the actual local commands.

## Install Matrix

| Surface | Install | Update |
| --- | --- | --- |
| Agent Skills hosts: Codex, Cursor, Gemini CLI, Copilot, Windsurf, and others | `npx skills add xiaoxiaofeiya/SkillOS -g` | `npx skills update skillos -g` |
| Claude Code plugin marketplace | `/plugin marketplace add xiaoxiaofeiya/SkillOS` then `/plugin install skillos` | `/plugin update skillos` |
| Windows runtime | Use the PowerShell command below | Run the same command again |
| macOS/Linux runtime | Use the shell command below | Run the same command again |
| GitHub source install | Clone the repo, then run `scripts/install.ps1` or `scripts/install.sh` | `git pull --ff-only`, then rerun the installer |
| Zip preview package | Download `skillos.zip`, extract, run `npm install`, `npm run build`, then `node packages/cli/dist/index.js setup --safety approve` | Download the latest zip |

## Recommended User Path

For non-technical users, use both layers:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Then install the runtime:

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

On macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

After installation:

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "Make this app production-ready and verify it"
skillos explain --last
```

On Windows PowerShell, use `skillos.cmd` if execution policy blocks npm-generated `.ps1` shims.

## Verified Paths

Run the isolated verifier before sharing a build:

```bash
npm run verify:install
```

The verifier creates temporary HOME/USERPROFILE, npm prefix/cache, install roots, and zip extraction directories. It checks local Agent Skills install, local runtime install, linked command shims, zip install, CLI smoke tests, and Claude marketplace metadata without writing to real global skills or client files.

Network-dependent verification is separate:

```bash
npm run verify:install:network
```

`network_failed` means the remote GitHub/npm path failed because of connectivity, reset, timeout, proxy, DNS, TLS, or clone errors. Treat that differently from `fail`, which means the repository or installer is invalid.

## Claude Code Path

Claude Code can install the plugin entry from GitHub:

```text
/plugin marketplace add xiaoxiaofeiya/SkillOS
/plugin install skillos
```

The plugin entry teaches Claude Code when to use SkillOS. The local runtime still needs to exist for CLI and MCP commands.

## Agent Skills CLI Path

Agent Skills-compatible hosts can install from the repository:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

Use `-g` for a global user install across projects. Omit `-g` for a project-local `.skills/` install.

Target a specific host when needed:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g -a codex
npx skills add xiaoxiaofeiya/SkillOS -g -a cursor
npx skills add xiaoxiaofeiya/SkillOS -g -a windsurf
```

## Runtime Installer Details

The runtime installers:

- Clone or update `https://github.com/xiaoxiaofeiya/SkillOS.git`.
- Run `npm install`.
- Build the workspace.
- Link `skillos` and `skillos-mcp-server` globally unless `--no-link` is used.
- Run `skillos setup --safety approve` unless `--skip-setup` is used.

Windows options:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-from-github.ps1 -Safety approve
powershell -ExecutionPolicy Bypass -File .\scripts\install-from-github.ps1 -NoLink
powershell -ExecutionPolicy Bypass -File .\scripts\install-from-github.ps1 -SkipSetup
```

macOS/Linux options:

```bash
bash scripts/install-from-github.sh --safety approve
bash scripts/install-from-github.sh --no-link
bash scripts/install-from-github.sh --skip-setup
```

## Configuration

After runtime installation, generate client presets:

```bash
skillos setup --safety approve --clients codex,claude-code,cursor,windsurf,openhands,openclaw
```

Review before writing real client files:

```bash
skillos preset diff --client codex
```

Apply only after review:

```bash
skillos preset apply --client codex --confirm
```

SkillOS stores local state in `.skillos/`. That directory is private local data and must not be included in release bundles.

## Fallbacks

If `npx skills add xiaoxiaofeiya/SkillOS -g` or the one-line GitHub bootstrap fails because GitHub clone is unstable, use one of these paths:

- Manually clone the repository, then run `scripts/install.ps1` or `scripts/install.sh`.
- Download the latest `skillos.zip`, extract it, run `npm ci`, `npm run build`, and `node packages/cli/dist/index.js setup --safety approve`.
- Install only the agent-facing skill from a local clone with `npx skills add . -g -a codex --skill skillos --copy`.
