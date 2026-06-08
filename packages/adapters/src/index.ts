import { createPresetAdapter } from "./base.js";
import { createOpenClawAdapter } from "./openclaw.js";
import type { ClientAdapter } from "@skillos/core";

export * from "./base.js";
export * from "./openclaw.js";

export function createAllAdapters(): ClientAdapter[] {
  return [
    createPresetAdapter({
      clientId: "codex",
      displayName: "Codex",
      ruleFileName: "AGENTS.md",
      mcpConfigFileName: "codex-mcp.json"
    }),
    createPresetAdapter({
      clientId: "claude-code",
      displayName: "Claude Code",
      ruleFileName: "CLAUDE.md",
      mcpConfigFileName: "claude-mcp.json"
    }),
    createPresetAdapter({
      clientId: "cursor",
      displayName: "Cursor",
      ruleFileName: ".cursor/rules/skillos.mdc",
      mcpConfigFileName: ".cursor/mcp.json"
    }),
    createPresetAdapter({
      clientId: "windsurf",
      displayName: "Windsurf",
      ruleFileName: ".windsurf/rules/skillos.md",
      mcpConfigFileName: ".windsurf/mcp.json"
    }),
    createPresetAdapter({
      clientId: "openhands",
      displayName: "OpenHands",
      ruleFileName: ".openhands/microagents/skillos.md",
      mcpConfigFileName: ".openhands/mcp.json"
    }),
    createOpenClawAdapter()
  ];
}

export function getAdapter(id: string): ClientAdapter | undefined {
  return createAllAdapters().find((adapter) => adapter.id === id);
}
