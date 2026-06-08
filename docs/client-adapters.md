# Client Adapters

SkillOS adapters map a common skill chain into client-specific configuration.

Supported first-party adapters:

- Codex: `AGENTS.md`, MCP config, skill preset.
- Claude Code: `CLAUDE.md`, MCP config, hook/subagent guidance.
- Cursor: `.cursor/rules/skillos.mdc`, MCP config.
- Windsurf: `.windsurf/rules/skillos.md`, MCP config.
- OpenHands: microagent/rule guidance and MCP config.
- OpenClaw: native plugin manifest, OpenClaw-like manifest, MCP config, ACP/Gateway hints.

Adapters should not contain routing logic. Routing belongs to `@skillos/core`.

Each adapter implements:

- `renderPreset(config)`: render files for distribution.
- `renderInstallPlan(root, config)`: return target paths and content without writing real client config.
- `diffExistingConfig(root, plan)`: show create/update/unchanged actions.
- `verifyInstall(root)`: report whether expected SkillOS files are present.
- `renderInvocationHints(chain)`: map a SkillOS chain into client-specific guidance.

The default product flow is generate and review first:

```bash
skillos setup --safety approve
skillos preset diff --client codex
skillos preset apply --client codex --confirm
```
