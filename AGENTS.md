# SkillOS Repository Guide

SkillOS is a TypeScript/Node monorepo for local-first skill orchestration across coding-agent clients.

## Development

- Use `npm.cmd` on Windows PowerShell.
- Build with `npm.cmd run build`.
- Run tests with `npm.cmd test`.
- Verify distribution with `npm.cmd run release:local`.
- Keep root `package.json` private. The publishable packages live under `packages/*`.

## Distribution Surfaces

- Agent Skills entry: `skills/skillos/SKILL.md`.
- Codex plugin manifest: `.codex-plugin/plugin.json`.
- Codex/agent marketplace: `.agents/plugins/marketplace.json`.
- Claude Code plugin manifest and marketplace: `.claude-plugin/`.
- Gemini metadata: `gemini-extension.json`.
- OpenClaw/OpenClaw-like presets: `presets/openclaw/`.

Do not commit `.skillos/`, `node_modules/`, `dist/`, `dist-presets/`, logs, env files, local paths, tokens, or API keys.

## Release Checks

Before publishing a preview build, run:

```powershell
npm.cmd test
npm.cmd run pack:zip
node packages\cli\dist\index.js pack verify --format json
npm.cmd run pack:npm
```
