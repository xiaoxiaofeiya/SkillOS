import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSkillOSDir } from "./paths.js";
import type { SafetyProfile, SkillOSConfig } from "./types.js";

export function defaultConfig(safetyProfile: SafetyProfile = "approve"): SkillOSConfig {
  return {
    version: 1,
    safetyProfile,
    telemetry: false,
    modelEnhancement: {
      enabled: false,
      provider: "openai-compatible",
      apiKeyEnv: "OPENAI_API_KEY",
      baseUrl: "https://api.openai.com/v1",
      embeddingModel: "text-embedding-3-small",
      maxCandidates: 24,
      enableLlmRerank: false,
      enableSummaries: false,
      enableFailureReview: false,
      llmModel: "",
      chatCompletionsPath: "/chat/completions"
    },
    clients: {
      codex: { enabled: true },
      "claude-code": { enabled: true },
      cursor: { enabled: true },
      windsurf: { enabled: true },
      openhands: { enabled: true },
      openclaw: { enabled: true }
    }
  };
}

export async function initSkillOSConfig(root: string, safetyProfile: SafetyProfile): Promise<SkillOSConfig> {
  const dir = getSkillOSDir(root);
  await mkdir(join(dir, "evals"), { recursive: true });
  const config = defaultConfig(safetyProfile);
  await writeFile(join(dir, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await writeFile(join(dir, "capabilities.json"), `${JSON.stringify({ version: 1, generatedAt: null, cards: [] }, null, 2)}\n`, "utf8");
  await writeFile(join(dir, "decision-log.jsonl"), "", "utf8");
  await writeFile(join(dir, "routing-memory.json"), `${JSON.stringify({ version: 1, preferences: [] }, null, 2)}\n`, "utf8");
  return config;
}

export async function readSkillOSConfig(root: string = process.cwd()): Promise<SkillOSConfig> {
  const path = join(getSkillOSDir(root), "config.json");
  if (!existsSync(path)) return defaultConfig();
  return mergeConfig(defaultConfig(), JSON.parse(await readFile(path, "utf8")));
}

function mergeConfig(base: SkillOSConfig, override: Partial<SkillOSConfig>): SkillOSConfig {
  return {
    ...base,
    ...override,
    modelEnhancement: {
      ...base.modelEnhancement,
      ...(override.modelEnhancement ?? {})
    },
    clients: {
      ...base.clients,
      ...(override.clients ?? {})
    }
  };
}
