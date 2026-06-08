# OpenClaw-Like Adapter Protocol

OpenClaw and OpenClaw-like clients are treated as first-class runtimes.

If a client provides `openclaw-like.manifest.json`, SkillOS reads:

- `roots.skills`
- `roots.plugins`
- `roots.hooks`
- `roots.mcp`
- `capabilities`

If no manifest exists, SkillOS probes conventional directories:

- `skills/`
- `plugins/`
- `hooks/`
- `mcp/`
- `acp/`
- `gateway/`

The adapter maps a `SkillChain` into an OpenClaw workflow object with phases, selected skill ids, approval requirements, and risk levels.

The OpenClaw preset includes:

- `openclaw-plugin.json`
- `openclaw-like.manifest.json`
- `skillos.mcp.json`
- `skillos.config.example.json`

OpenClaw-like variants should prefer an explicit `openclaw-like.manifest.json`. If no manifest exists, SkillOS falls back to capability probing and reports the detected directories through `detectCapabilities()`.
