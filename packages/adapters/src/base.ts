import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClientAdapter, ClientInstallPlan, PresetDiff, SkillChain, SkillOSConfig } from "@skillos/core";

export interface AdapterPresetOptions {
  clientId: string;
  displayName: string;
  ruleFileName: string;
  mcpConfigFileName: string;
}

export function createPresetAdapter(options: AdapterPresetOptions): ClientAdapter {
  return {
    id: options.clientId,
    displayName: options.displayName,
    async detectCapabilities(root = process.cwd()) {
      return {
        client: options.clientId,
        root,
        supportsMcp: true,
        supportsRules: true,
        supportsNativeSkills: ["codex", "claude-code", "openhands", "openclaw"].includes(options.clientId),
        supportsHooks: ["claude-code", "windsurf", "openclaw"].includes(options.clientId),
        expectedFiles: [options.ruleFileName, options.mcpConfigFileName],
        installed: [options.ruleFileName, options.mcpConfigFileName].filter((file) => existsSync(join(root, file)))
      };
    },
    async renderPreset(config: SkillOSConfig) {
      return {
        [options.ruleFileName]: renderRuleFile(options),
        [options.mcpConfigFileName]: renderMcpConfig(options.clientId),
        "skillos.config.example.json": JSON.stringify(config, null, 2)
      };
    },
    async renderInstallPlan(root: string, config: SkillOSConfig) {
      const preset = await this.renderPreset(config);
      return {
        clientId: options.clientId,
        displayName: options.displayName,
        root,
        safetyProfile: config.safetyProfile,
        targets: Object.entries(preset).map(([relativePath, content]) => ({
          clientId: options.clientId,
          relativePath,
          targetPath: join(root, relativePath),
          content,
          description: describeTarget(relativePath, options.displayName),
          risk: "medium"
        })),
        notes: [
          `${options.displayName}: generate rules and MCP configuration first; apply only after user confirmation.`,
          "SkillOS should be called before non-trivial work, and again before implementation, verification, deployment, security review, and final response."
        ]
      };
    },
    async diffExistingConfig(root: string, plan: ClientInstallPlan) {
      return diffPlanTargets(root, plan);
    },
    async verifyInstall(root: string) {
      const expected = [options.ruleFileName, options.mcpConfigFileName];
      const files = [];
      for (const file of expected) {
        const targetPath = join(root, file);
        const exists = existsSync(targetPath);
        const containsSkillOS = exists ? (await readFile(targetPath, "utf8").catch(() => "")).toLowerCase().includes("skillos") : false;
        files.push({ relativePath: file, exists, containsSkillOS });
      }
      return {
        client: options.clientId,
        ok: files.every((file) => file.exists && file.containsSkillOS),
        files
      };
    },
    renderInvocationHints(chain: SkillChain) {
      return [
        `${options.displayName}: call SkillOS before task execution for chain ${chain.id}.`,
        `Selected phases: ${chain.steps.map((step) => step.phase).join(", ")}.`
      ];
    }
  };
}

export async function diffPlanTargets(_root: string, plan: ClientInstallPlan): Promise<PresetDiff[]> {
  const diffs: PresetDiff[] = [];
  for (const target of plan.targets) {
    const existing = existsSync(target.targetPath) ? await readFile(target.targetPath, "utf8").catch(() => "") : "";
    const existingHash = existing ? sha256(existing) : undefined;
    const nextHash = sha256(target.content);
    const action = existingHash === undefined ? "create" : existingHash === nextHash ? "unchanged" : "update";
    diffs.push({
      clientId: target.clientId,
      targetPath: target.targetPath,
      action,
      existingHash,
      nextHash,
      preview: renderPreview(existing, target.content)
    });
  }
  return diffs;
}

function renderRuleFile(options: AdapterPresetOptions): string {
  const clientSpecific = clientSpecificGuidance(options.clientId);
  return [
    `# ${options.displayName} SkillOS Preset`,
    "",
    "For non-trivial development work, call SkillOS first.",
    "Use SkillOS to inventory local skills, recommend a skill chain, render only the needed skill context, and record the decision.",
    "Re-check SkillOS before implementation, verification, deployment, security review, and final response.",
    "Respect the configured SkillOS safety profile before file writes, commands, external network actions, deployments, and credential use.",
    "",
    clientSpecific,
    ""
  ].join("\n");
}

function clientSpecificGuidance(clientId: string): string {
  switch (clientId) {
    case "codex":
      return "Codex: keep this guidance in AGENTS.md and connect the SkillOS MCP server through the provided MCP config.";
    case "claude-code":
      return "Claude Code: use this file as CLAUDE.md project guidance; pair it with MCP and hooks/subagent guidance when available.";
    case "cursor":
      return "Cursor: use this as a project rule file so SkillOS routing happens before implementation and verification.";
    case "windsurf":
      return "Windsurf: use this as Cascade rule/workflow guidance and keep MCP discovery available.";
    case "openhands":
      return "OpenHands: use this as microagent/AgentSkills guidance and invoke SkillOS before selecting native skills.";
    default:
      return "Client: use this preset to call SkillOS before selecting local skills, tools, or workflows.";
  }
}

function renderMcpConfig(clientId: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        skillos: {
          command: "skillos-mcp-server",
          args: ["--client", clientId]
        }
      }
    },
    null,
    2
  );
}

function describeTarget(relativePath: string, displayName: string): string {
  if (relativePath.endsWith(".json")) return `${displayName} MCP or SkillOS configuration`;
  return `${displayName} rule or guidance file`;
}

function renderPreview(existing: string, next: string): string {
  if (!existing) return next.split(/\r?\n/).slice(0, 12).join("\n");
  const existingLines = existing.split(/\r?\n/);
  const nextLines = next.split(/\r?\n/);
  const preview = [
    "--- existing",
    ...existingLines.slice(0, 6).map((line) => `- ${line}`),
    "+++ next",
    ...nextLines.slice(0, 6).map((line) => `+ ${line}`)
  ];
  return preview.join("\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
