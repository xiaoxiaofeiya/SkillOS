# MCP Distribution

SkillOS exposes a stdio MCP server through `@skillos/mcp-server`.

The server is useful when an agent client wants structured tools for:

- Skill inventory.
- Skill search.
- Skill inspection.
- Skill-chain recommendation.
- Bounded skill-context rendering.
- Decision recording and explanation.
- Feedback recording.
- Routing evals.
- Client preset rendering and setup verification.

## npm Package

The package is:

```text
@skillos/mcp-server
```

Preview version:

```text
0.1.0-preview.1
```

The package exposes:

```json
{
  "bin": {
    "skillos-mcp-server": "dist/index.js"
  },
  "mcpName": "io.github.xiaoxiaofeiya/skillos"
}
```

After npm publish, users should be able to run:

```bash
npx @skillos/mcp-server
```

## MCP Registry Metadata

The repository root includes `server.json`.

Required identity:

```json
{
  "name": "io.github.xiaoxiaofeiya/skillos",
  "version": "0.1.0-preview.1"
}
```

The npm package entry must point to `@skillos/mcp-server` and declare `stdio` transport.

## Official MCP Registry

Publish only after npm preview package is live:

```bash
mcp-publisher publish
```

If auth is missing, record:

```json
{
  "platform": "mcp-registry",
  "status": "skipped",
  "reason": "auth_missing"
}
```

## Glama

Submit:

- Repository: `https://github.com/xiaoxiaofeiya/SkillOS`
- MCP package: `@skillos/mcp-server`
- MCP name: `io.github.xiaoxiaofeiya/skillos`
- Transport: `stdio`
- Description: `Local-first skill orchestration for coding agents.`

## Smithery

Submit the same repo, npm package, and MCP name. Keep local routing and local logs called out clearly.

## PulseMCP

Submit the server listing after npm publish and MCP metadata verification.

Recommended short listing:

```text
SkillOS is a local-first MCP server and CLI for discovering installed agent skills, recommending staged skill chains, rendering bounded skill context, recording routing decisions, accepting feedback, and generating client presets.
```
