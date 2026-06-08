# @skillos/mcp-server

SkillOS MCP server over JSON-RPC stdio.

It exposes progressive discovery tools for local skills, routing recommendations, bounded skill context rendering, decision logging, feedback, evals, client preset rendering, and client setup verification.

The server returns stable JSON envelopes:

```json
{ "ok": true, "version": 1, "data": {} }
```

Errors use:

```json
{ "ok": false, "version": 1, "error": { "code": "example", "message": "..." } }
```
