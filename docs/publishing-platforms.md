# Publishing Platforms

SkillOS is designed to be discovered across several developer ecosystems, not only through GitHub.

This page tracks where SkillOS can be published, what each platform needs, and how failures should be reported.

## Platform Matrix

| Platform | Purpose | Status | Publish or Submit Path |
| --- | --- | --- | --- |
| GitHub repository | Public source, docs, install scripts, release tags | Ready | `git push`, then tag `v0.1.0-preview.1` |
| GitHub Release | Public `skillos.zip` download | Ready via workflow | `git tag v0.1.0-preview.1 && git push origin v0.1.0-preview.1` |
| Agent Skills / skills.sh | Agent-facing skill discovery and install | Ready | `npx skills add xiaoxiaofeiya/SkillOS -g` |
| GitHub Copilot skills | Copilot Agent Skills discovery | Ready for dry-run when `gh` exists | `gh skill publish --dry-run` |
| Claude Code plugin marketplace | Claude plugin install by repo | Ready | `/plugin marketplace add xiaoxiaofeiya/SkillOS` then `/plugin install skillos` |
| npm preview packages | Runtime and MCP package distribution | Requires npm auth and `@skillos` scope | `npm publish --workspace ... --tag preview` |
| MCP Registry | Official MCP server discovery | Requires npm package and `mcp-publisher` auth | `mcp-publisher publish` |
| Glama | MCP server directory and discovery | Manual submission | Submit GitHub repo and MCP metadata |
| Smithery | MCP server publishing and hosting ecosystem | Manual submission unless CLI/API is configured | Submit MCP server package metadata |
| PulseMCP | MCP server directory | Manual submission | Submit server listing and repo URL |
| OpenClaw / ClawHub | OpenClaw skill discovery | Requires `clawhub` auth | `clawhub skill publish ./skills/skillos ...` |
| Awesome lists and communities | Human discovery | Manual submission | Use `docs/community-launch-kit.md` |

## Required Local Gates

Run before publishing:

```bash
npm test
npm run pack:zip
node packages/cli/dist/index.js pack verify --format json
npm run pack:npm
npm run verify:install
npm run verify:install:network
npm run verify:publish-readiness
npm run publish:preview:dry-run
```

## Live Publish Command

Use this only after the gates pass and the git worktree is clean:

```bash
npm run publish:preview:live
```

The script is allowed to create and push `v0.1.0-preview.1`. It must not claim a platform was published when the required tool or auth is missing. Expected skipped results look like:

```json
{
  "platform": "npm-preview-packages",
  "status": "skipped",
  "reason": "auth_missing"
}
```

## Platform Commands

Agent Skills:

```bash
npx skills add xiaoxiaofeiya/SkillOS -l -a codex --full-depth
npx skills add xiaoxiaofeiya/SkillOS -g -a codex --skill skillos --copy
```

GitHub Copilot / Agent Skills release validation:

```bash
gh skill publish --dry-run
```

Claude Code:

```text
/plugin marketplace add xiaoxiaofeiya/SkillOS
/plugin install skillos
```

npm preview packages:

```bash
npm publish --workspace @skillos/core --access public --tag preview
npm publish --workspace @skillos/adapters --access public --tag preview
npm publish --workspace @skillos/mcp-server --access public --tag preview
npm publish --workspace @skillos/cli --access public --tag preview
```

MCP Registry:

```bash
mcp-publisher publish
```

ClawHub:

```bash
clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version 0.1.0-preview.1 --dry-run
clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version 0.1.0-preview.1
```

## Fallbacks

- If GitHub network fails, retry `verify:install:network` later and use source or release zip install meanwhile.
- If npm scope access fails, keep GitHub Release, Agent Skills, Claude plugin, and MCP metadata public; do not rename packages in the same release.
- If MCP Registry publishing fails because npm is not published, wait until npm preview packages are live.
- If `gh`, `clawhub`, or `mcp-publisher` is missing, record `tool_missing` and keep the manual commands in this page.
