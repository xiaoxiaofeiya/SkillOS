import type { SkillCapabilityCard } from "./types.js";

export function getBuiltInCapabilityCards(): SkillCapabilityCard[] {
  return [
    makeCard({
      id: "tool:skillos-mcp-server",
      name: "skillos-mcp-server",
      description: "SkillOS MCP server exposing inventory_skills, search_skills, inspect_skill, recommend_skill_chain, render_skill_context, record_decision, record_feedback, run_eval, and detect_skill_gap tools.",
      domains: ["mcp"],
      triggers: ["mcp", "model context protocol", "tool server", "progressive discovery", "recommend_skill_chain"]
    }),
    makeCard({
      id: "client-adapter:codex",
      name: "codex-adapter",
      description: "Codex adapter that renders AGENTS.md guidance, MCP configuration, and skill orchestration presets.",
      domains: ["openai", "mcp"],
      triggers: ["codex", "agents.md", "openai", "mcp", "skill orchestration"]
    }),
    makeCard({
      id: "client-adapter:claude-code",
      name: "claude-code-adapter",
      description: "Claude Code adapter that renders CLAUDE.md guidance, MCP configuration, hook guidance, and subagent-oriented invocation hints.",
      domains: ["mcp", "general"],
      triggers: ["claude code", "claude", "hooks", "subagent", "mcp"]
    }),
    makeCard({
      id: "client-adapter:cursor",
      name: "cursor-adapter",
      description: "Cursor adapter that renders rules and MCP configuration for SkillOS progressive skill discovery.",
      domains: ["mcp", "general"],
      triggers: ["cursor", "rules", "custom mode", "mcp"]
    }),
    makeCard({
      id: "client-adapter:windsurf",
      name: "windsurf-adapter",
      description: "Windsurf adapter that renders rules, workflow guidance, and MCP configuration for Cascade skill routing.",
      domains: ["mcp", "general"],
      triggers: ["windsurf", "cascade", "rules", "workflow", "mcp"]
    }),
    makeCard({
      id: "client-adapter:openhands",
      name: "openhands-adapter",
      description: "OpenHands adapter that renders AgentSkills, microagent guidance, keyword trigger guidance, and MCP configuration.",
      domains: ["mcp", "general"],
      triggers: ["openhands", "agentskills", "microagent", "invoke_skill", "mcp"]
    }),
    makeCard({
      id: "client-adapter:openclaw",
      name: "openclaw-adapter",
      description: "OpenClaw and OpenClaw-like adapter protocol for native plugins, skills, hooks, MCP, ACP harnesses, Gateway runtime manifests, capability probing, and workflow mapping.",
      domains: ["openclaw", "mcp"],
      triggers: ["openclaw", "claw", "openclaw-like", "acp", "gateway", "plugin", "hooks", "mcp"]
    })
  ];
}

function makeCard(input: Pick<SkillCapabilityCard, "id" | "name" | "description" | "domains" | "triggers">): SkillCapabilityCard {
  return {
    ...input,
    path: "",
    source: "tool",
    inputs: ["task"],
    outputs: ["guidance", "generated-presets"],
    sideEffects: [],
    risk: input.domains.includes("openclaw") || input.domains.includes("mcp") ? "medium" : "low",
    requiresCredentials: false,
    verificationStrength: "medium",
    clientCompatibility: ["codex", "claude-code", "cursor", "windsurf", "openhands", "openclaw"],
    confidence: 1
  };
}
