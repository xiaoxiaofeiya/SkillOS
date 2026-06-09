# Launch Checklist

This checklist is for `v0.1.0-preview.1`.

## 1. Local Quality Gates

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

Pass criteria:

- Tests pass.
- Zip verification returns `ok: true`.
- Local and network installation verification pass or network failures are clearly classified.
- Publish readiness has no `fail` entries.
- Dry-run shows planned or skipped platforms without pretending to publish.

## 2. GitHub Release

```bash
git tag v0.1.0-preview.1
git push origin v0.1.0-preview.1
```

Expected:

- GitHub Actions creates a release.
- Release assets include `skillos.zip` and `pack-verification.json`.
- README points to the release download path.

## 3. Agent Skills and Claude

Validate Agent Skills:

```bash
npx skills add xiaoxiaofeiya/SkillOS -l -a codex --full-depth
npx skills add xiaoxiaofeiya/SkillOS -g -a codex --skill skillos --copy
```

Validate Claude Code docs:

```text
/plugin marketplace add xiaoxiaofeiya/SkillOS
/plugin install skillos
```

If GitHub CLI is available:

```bash
gh repo edit xiaoxiaofeiya/SkillOS --add-topic agent-skills,mcp,mcp-server,codex,claude-code,cursor,windsurf,openhands,openclaw,ai-agents,developer-tools
gh skill publish --dry-run
```

## 4. npm and MCP

Only publish npm after confirming the account can publish under `@skillos`.

```bash
npm whoami
npm publish --workspace @skillos/core --access public --tag preview
npm publish --workspace @skillos/adapters --access public --tag preview
npm publish --workspace @skillos/mcp-server --access public --tag preview
npm publish --workspace @skillos/cli --access public --tag preview
```

Only publish MCP Registry after `@skillos/mcp-server@0.1.0-preview.1` is visible on npm:

```bash
mcp-publisher publish
```

## 5. OpenClaw and Community

If `clawhub` is authenticated:

```bash
clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version 0.1.0-preview.1 --dry-run
clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version 0.1.0-preview.1
```

Then use [Community Launch Kit](community-launch-kit.md) for human-facing channels.

## 6. Record Outcomes

After live publishing, update [Publishing Platforms](publishing-platforms.md) with public URLs for platforms that succeeded.

Do not mark manual-review platforms as published until they are visible publicly.
