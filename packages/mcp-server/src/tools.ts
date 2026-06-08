import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  defaultEvalCases,
  deriveCapabilityCards,
  detectRepoSignals,
  explainLastDecision,
  getBuiltInCapabilityCards,
  inventorySkills,
  readRoutingMemory,
  readSkillOSConfig,
  recommendSkillChain,
  recommendSkillChainEnhanced,
  recordDecisionTrace,
  recordUserFeedback,
  runRoutingEval,
  type SkillCapabilityCard
} from "@skillos/core";
import { getAdapter } from "@skillos/adapters";

export const toolDefinitions = [
  {
    name: "inventory_skills",
    description: "Scan local skills and return derived SkillOS capability cards.",
    inputSchema: {
      type: "object",
      properties: {
        includeSystem: { type: "boolean" },
        includeBuiltins: { type: "boolean" },
        skillsRoot: { type: "string" }
      }
    }
  },
  {
    name: "search_skills",
    description: "Search installed skills by query, repo signals, and phase.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        phase: { type: "string" },
        skillsRoot: { type: "string" }
      },
      required: ["query"]
    }
  },
  {
    name: "inspect_skill",
    description: "Inspect one installed skill capability card and optionally its SKILL.md.",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string" },
        includeBody: { type: "boolean" },
        skillsRoot: { type: "string" }
      },
      required: ["skillId"]
    }
  },
  {
    name: "recommend_skill_chain",
    description: "Recommend a staged skill chain for a task.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string" },
        phase: { type: "string" },
        safetyProfile: { type: "string" },
        modelEnhancement: { type: "boolean" },
        modelEnhancementApiKeyEnv: { type: "string" },
        modelEnhancementBaseUrl: { type: "string" },
        modelEnhancementEmbeddingModel: { type: "string" },
        modelEnhancementLlmModel: { type: "string" },
        modelEnhancementLlmRerank: { type: "boolean" },
        skillsRoot: { type: "string" },
        repoRoot: { type: "string" }
      },
      required: ["task"]
    }
  },
  {
    name: "render_skill_context",
    description: "Render bounded SKILL.md snippets for selected skill ids.",
    inputSchema: {
      type: "object",
      properties: {
        skillIds: { type: "array", items: { type: "string" } },
        tokenBudget: { type: "number" },
        skillsRoot: { type: "string" }
      },
      required: ["skillIds"]
    }
  },
  {
    name: "record_decision",
    description: "Record a redacted local SkillOS decision trace.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        task: { type: "string" },
        candidates: { type: "array" },
        selectedSkillIds: { type: "array", items: { type: "string" } },
        skippedSkillIds: { type: "array", items: { type: "string" } },
        outcome: { type: "string" },
        safetyProfile: { type: "string" }
      },
      required: ["task", "candidates", "selectedSkillIds", "skippedSkillIds"]
    }
  },
  {
    name: "record_feedback",
    description: "Record user feedback as a local decision event.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        decisionId: { type: "string" },
        correction: { type: "string" }
      },
      required: ["decisionId", "correction"]
    }
  },
  {
    name: "run_eval",
    description: "Run the built-in routing eval suite against installed skills.",
    inputSchema: {
      type: "object",
      properties: {
        suite: { type: "string" },
        skillsRoot: { type: "string" }
      }
    }
  },
  {
    name: "detect_skill_gap",
    description: "Detect capability gaps for a task given installed skills.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string" },
        skillsRoot: { type: "string" }
      },
      required: ["task"]
    }
  },
  {
    name: "render_client_preset",
    description: "Render a client preset and install plan without applying it.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        root: { type: "string" }
      },
      required: ["clientId"]
    }
  },
  {
    name: "verify_client_setup",
    description: "Verify whether a client appears to have SkillOS preset files installed.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        root: { type: "string" }
      },
      required: ["clientId"]
    }
  },
  {
    name: "explain_decision",
    description: "Explain the last local SkillOS routing decision.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" }
      }
    }
  }
] as const;

export async function callTool(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
  switch (name) {
    case "inventory_skills": {
      const cards = await loadCards(input);
      return ok({ cards });
    }
    case "search_skills": {
      const cards = await loadCards(input);
      const chain = recommendSkillChain({
        task: String(input.query ?? ""),
        cards,
        phase: input.phase as any
      });
      return ok({ candidates: chain.candidates.slice(0, 12), gaps: chain.gaps });
    }
    case "inspect_skill": {
      const cards = await loadCards(input);
      const card = cards.find((item) => item.id === input.skillId || item.name === input.skillId);
      if (!card) return fail("skill_not_found", `Skill not found: ${String(input.skillId ?? "")}`);
      const body = input.includeBody ? await readFile(join(card.path, "SKILL.md"), "utf8").catch(() => "") : undefined;
      return ok({ card, body });
    }
    case "recommend_skill_chain": {
      const cards = await loadCards(input);
      const repoSignals = input.repoRoot ? await detectRepoSignals(String(input.repoRoot)) : null;
      const config = await readSkillOSConfig(String(input.repoRoot ?? process.cwd()));
      const routingMemory = await readRoutingMemory(String(input.repoRoot ?? process.cwd()));
      return ok(await recommendSkillChainEnhanced({
        task: String(input.task ?? ""),
        cards,
        repoSignals,
        phase: input.phase as any,
        safetyProfile: (input.safetyProfile as any) ?? config.safetyProfile,
        routingMemory,
        modelEnhancement: {
          ...config.modelEnhancement,
          enabled: Boolean(input.modelEnhancement ?? config.modelEnhancement.enabled),
          apiKeyEnv: input.modelEnhancementApiKeyEnv ? String(input.modelEnhancementApiKeyEnv) : config.modelEnhancement.apiKeyEnv,
          baseUrl: input.modelEnhancementBaseUrl ? String(input.modelEnhancementBaseUrl) : config.modelEnhancement.baseUrl,
          embeddingModel: input.modelEnhancementEmbeddingModel ? String(input.modelEnhancementEmbeddingModel) : config.modelEnhancement.embeddingModel,
          llmModel: input.modelEnhancementLlmModel ? String(input.modelEnhancementLlmModel) : config.modelEnhancement.llmModel,
          enableLlmRerank: Boolean(input.modelEnhancementLlmRerank ?? config.modelEnhancement.enableLlmRerank)
        }
      }));
    }
    case "render_skill_context": {
      const cards = await loadCards(input);
      const ids = new Set((input.skillIds as string[]) ?? []);
      const budget = Number(input.tokenBudget ?? 8000);
      const selected = cards.filter((card) => ids.has(card.id) || ids.has(card.name));
      let remaining = budget * 4;
      const snippets = [];
      for (const card of selected) {
        const text = card.path
          ? await readFile(join(card.path, "SKILL.md"), "utf8").catch(() => "")
          : `# ${card.name}\n\n${card.description}\n\nDomains: ${card.domains.join(", ")}\nTriggers: ${card.triggers.join(", ")}\n`;
        const snippet = text.slice(0, Math.max(0, remaining));
        remaining -= snippet.length;
        snippets.push({ skillId: card.id, name: card.name, path: card.path, text: snippet });
        if (remaining <= 0) break;
      }
      return ok({ snippets, remainingChars: Math.max(0, remaining) });
    }
    case "record_decision": {
      return ok(await recordDecisionTrace(String(input.root ?? process.cwd()), {
        task: String(input.task ?? ""),
        repoSignals: null,
        candidates: input.candidates as any,
        selectedSkillIds: (input.selectedSkillIds as string[]) ?? [],
        skippedSkillIds: (input.skippedSkillIds as string[]) ?? [],
        outcome: input.outcome ? String(input.outcome) : undefined,
        safetyProfile: (input.safetyProfile as any) ?? "approve"
      }));
    }
    case "record_feedback": {
      return ok(await recordUserFeedback(String(input.root ?? process.cwd()), String(input.decisionId), String(input.correction)));
    }
    case "run_eval": {
      const cards = await loadCards(input);
      return ok(runRoutingEval(String(input.suite ?? "default"), defaultEvalCases, cards));
    }
    case "detect_skill_gap": {
      const cards = await loadCards(input);
      const chain = recommendSkillChain({ task: String(input.task ?? ""), cards });
      return ok({ gaps: chain.gaps });
    }
    case "render_client_preset": {
      const clientId = String(input.clientId ?? "");
      const adapter = getAdapter(clientId);
      if (!adapter) return fail("unknown_client", `Unknown client: ${clientId}`);
      const root = String(input.root ?? process.cwd());
      const config = await readSkillOSConfig(root);
      const plan = await adapter.renderInstallPlan(root, config);
      const diffs = await adapter.diffExistingConfig(root, plan);
      return ok({ plan, diffs });
    }
    case "verify_client_setup": {
      const clientId = String(input.clientId ?? "");
      const adapter = getAdapter(clientId);
      if (!adapter) return fail("unknown_client", `Unknown client: ${clientId}`);
      return ok(await adapter.verifyInstall(String(input.root ?? process.cwd())));
    }
    case "explain_decision": {
      const explanation = await explainLastDecision(String(input.root ?? process.cwd()));
      return explanation ? ok(explanation) : fail("decision_not_found", "No SkillOS decision log found.");
    }
    default:
      return fail("unknown_tool", `Unknown tool: ${name}`);
  }
}

async function loadCards(input: Record<string, unknown>): Promise<SkillCapabilityCard[]> {
  const skills = await inventorySkills({
    includeSystem: Boolean(input.includeSystem ?? true),
    skillsRoot: input.skillsRoot ? String(input.skillsRoot) : undefined
  });
  const cards = deriveCapabilityCards(skills);
  if (input.includeBuiltins !== false) cards.push(...getBuiltInCapabilityCards());
  return cards;
}

function ok<T>(data: T): { ok: true; version: 1; data: T } {
  return { ok: true, version: 1, data };
}

function fail(code: string, message: string): { ok: false; version: 1; error: { code: string; message: string } } {
  return { ok: false, version: 1, error: { code, message } };
}
