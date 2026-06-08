import type { RepoSignals, RoutingMemory, SafetyProfile, SkillCapabilityCard, SkillChain, TaskPhase } from "./types.js";
import { recommendSkillChain } from "./routing.js";

export interface EnhancedRecommendOptions {
  task: string;
  cards: SkillCapabilityCard[];
  repoSignals?: RepoSignals | null;
  phase?: TaskPhase;
  safetyProfile?: SafetyProfile;
  routingMemory?: RoutingMemory | null;
  modelEnhancement?: {
    enabled: boolean;
    provider?: string;
    apiKeyEnv?: string;
    baseUrl?: string;
    embeddingModel?: string;
    maxCandidates?: number;
    enableLlmRerank?: boolean;
    enableSummaries?: boolean;
    enableFailureReview?: boolean;
    llmModel?: string;
    chatCompletionsPath?: string;
  };
  env?: NodeJS.ProcessEnv;
}

export interface EnhancedSkillChain extends SkillChain {
  enhancement: {
    enabled: boolean;
    provider?: string;
    model?: string;
    applied: boolean;
    reason: string;
    stages?: string[];
  };
}

export async function recommendSkillChainEnhanced(options: EnhancedRecommendOptions): Promise<EnhancedSkillChain> {
  const local = recommendSkillChain(options);
  const enhancement = options.modelEnhancement;
  if (!enhancement?.enabled) {
    return withEnhancement(local, {
      enabled: false,
      provider: enhancement?.provider,
      model: enhancement?.embeddingModel,
      applied: false,
      reason: "model enhancement disabled",
      stages: []
    });
  }

  const provider = enhancement.provider ?? "openai-compatible";
  if (provider !== "openai-compatible") {
    return withEnhancement(local, {
      enabled: true,
      provider,
      model: enhancement.embeddingModel,
      applied: false,
      reason: `unsupported provider: ${provider}`,
      stages: []
    });
  }

  const env = options.env ?? process.env;
  const apiKeyEnv = enhancement.apiKeyEnv ?? "OPENAI_API_KEY";
  const apiKey = env[apiKeyEnv];
  if (!apiKey) {
    return withEnhancement(local, {
      enabled: true,
      provider,
      model: enhancement.embeddingModel,
      applied: false,
      reason: `missing API key env ${apiKeyEnv}`,
      stages: []
    });
  }

  try {
    let reranked = await rerankWithEmbeddings({
      chain: local,
      task: options.task,
      cards: options.cards,
      apiKey,
      baseUrl: enhancement.baseUrl ?? "https://api.openai.com/v1",
      model: enhancement.embeddingModel ?? "text-embedding-3-small",
      maxCandidates: enhancement.maxCandidates ?? 24
    });
    const stages = ["embedding-rerank"];
    if (enhancement.enableLlmRerank) {
      const llmResult = await rerankWithLlm({
        chain: reranked,
        task: options.task,
        cards: options.cards,
        apiKey,
        baseUrl: enhancement.baseUrl ?? "https://api.openai.com/v1",
        model: enhancement.llmModel,
        path: enhancement.chatCompletionsPath ?? "/chat/completions"
      });
      reranked = llmResult.chain;
      stages.push(llmResult.applied ? "llm-rerank" : `llm-rerank-skipped:${llmResult.reason}`);
    }
    return withEnhancement(reranked, {
      enabled: true,
      provider,
      model: enhancement.embeddingModel ?? "text-embedding-3-small",
      applied: true,
      reason: "model enhancement applied",
      stages
    });
  } catch (err) {
    return withEnhancement(local, {
      enabled: true,
      provider,
      model: enhancement.embeddingModel ?? "text-embedding-3-small",
      applied: false,
      reason: `model enhancement failed; local routing used: ${err instanceof Error ? err.message : String(err)}`,
      stages: []
    });
  }
}

export async function summarizeSkillDescriptions(options: {
  cards: SkillCapabilityCard[];
  modelEnhancement?: EnhancedRecommendOptions["modelEnhancement"];
  env?: NodeJS.ProcessEnv;
}): Promise<{ applied: boolean; reason: string; summaries: Array<{ skillId: string; name: string; summary: string }> }> {
  const config = options.modelEnhancement;
  const local = options.cards.map((card) => ({
    skillId: card.id,
    name: card.name,
    summary: card.description.split(/[.!?]\s+/)[0]?.slice(0, 240) || `${card.name}: ${card.domains.join(", ")}`
  }));
  if (!config?.enabled || !config.enableSummaries) {
    return { applied: false, reason: "model summaries disabled; local summaries returned", summaries: local };
  }
  const apiKey = (options.env ?? process.env)[config.apiKeyEnv ?? "OPENAI_API_KEY"];
  if (!apiKey || !config.llmModel) {
    return { applied: false, reason: "missing API key or llmModel; local summaries returned", summaries: local };
  }
  try {
    const response = await callChatCompletions({
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      path: config.chatCompletionsPath ?? "/chat/completions",
      apiKey,
      model: config.llmModel,
      messages: [
        { role: "system", content: "Summarize each skill in compact routing-focused JSON." },
        { role: "user", content: JSON.stringify(options.cards.map((card) => ({ id: card.id, name: card.name, description: card.description, domains: card.domains }))) }
      ]
    });
    const summaries = parseJsonArray(response).map((item: any) => ({
      skillId: String(item.skillId ?? item.id ?? ""),
      name: String(item.name ?? ""),
      summary: String(item.summary ?? "").slice(0, 500)
    })).filter((item) => item.skillId && item.summary);
    return summaries.length ? { applied: true, reason: "LLM summaries applied", summaries } : { applied: false, reason: "LLM summaries empty; local summaries returned", summaries: local };
  } catch (err) {
    return { applied: false, reason: `LLM summaries failed; local summaries returned: ${err instanceof Error ? err.message : String(err)}`, summaries: local };
  }
}

export async function reviewRoutingFailure(options: {
  task: string;
  correction: string;
  chain: SkillChain;
  modelEnhancement?: EnhancedRecommendOptions["modelEnhancement"];
  env?: NodeJS.ProcessEnv;
}): Promise<{ applied: boolean; reason: string; suggestions: string[] }> {
  const local = [
    `Review correction for task: ${options.task}`,
    `Prefer or avoid skills based on feedback: ${options.correction}`
  ];
  const config = options.modelEnhancement;
  if (!config?.enabled || !config.enableFailureReview) {
    return { applied: false, reason: "model failure review disabled; local suggestions returned", suggestions: local };
  }
  const apiKey = (options.env ?? process.env)[config.apiKeyEnv ?? "OPENAI_API_KEY"];
  if (!apiKey || !config.llmModel) {
    return { applied: false, reason: "missing API key or llmModel; local suggestions returned", suggestions: local };
  }
  try {
    const response = await callChatCompletions({
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      path: config.chatCompletionsPath ?? "/chat/completions",
      apiKey,
      model: config.llmModel,
      messages: [
        { role: "system", content: "Return JSON array of short routing-rule improvement suggestions." },
        { role: "user", content: JSON.stringify({ task: options.task, correction: options.correction, chain: options.chain }) }
      ]
    });
    const suggestions = parseJsonArray(response).map((item) => String(item)).filter(Boolean);
    return suggestions.length ? { applied: true, reason: "LLM failure review applied", suggestions } : { applied: false, reason: "LLM failure review empty; local suggestions returned", suggestions: local };
  } catch (err) {
    return { applied: false, reason: `LLM failure review failed; local suggestions returned: ${err instanceof Error ? err.message : String(err)}`, suggestions: local };
  }
}

async function rerankWithEmbeddings(options: {
  chain: SkillChain;
  task: string;
  cards: SkillCapabilityCard[];
  apiKey: string;
  baseUrl: string;
  model: string;
  maxCandidates: number;
}): Promise<SkillChain> {
  const considered = options.chain.candidates.slice(0, options.maxCandidates);
  const cardById = new Map(options.cards.map((card) => [card.id, card]));
  const inputs = [
    options.task,
    ...considered.map((candidate) => {
      const card = cardById.get(candidate.skillId);
      return `${candidate.name}\n${card?.description ?? ""}\n${card?.domains.join(", ") ?? ""}`;
    })
  ];
  const vectors = await createEmbeddings(options.baseUrl, options.apiKey, options.model, inputs);
  const taskVector = vectors[0];
  const scoreById = new Map<string, number>();
  for (let index = 0; index < considered.length; index++) {
    const candidate = considered[index];
    const semantic = cosine(taskVector, vectors[index + 1]);
    scoreById.set(candidate.skillId, Number(Math.max(0, Math.min(1, candidate.score * 0.65 + semantic * 0.35)).toFixed(3)));
  }

  return {
    ...options.chain,
    candidates: options.chain.candidates
      .map((candidate) => {
        const score = scoreById.get(candidate.skillId);
        if (score === undefined) return candidate;
        return {
          ...candidate,
          score,
          skipped: score < 0.3,
          skipReason: score < 0.3 ? "score below selection threshold 0.3 after embedding rerank" : undefined,
          reasons: [...candidate.reasons, "embedding semantic rerank"]
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  };
}

async function rerankWithLlm(options: {
  chain: SkillChain;
  task: string;
  cards: SkillCapabilityCard[];
  apiKey: string;
  baseUrl: string;
  model?: string;
  path: string;
}): Promise<{ applied: boolean; reason: string; chain: SkillChain }> {
  if (!options.model) {
    return { applied: false, reason: "missing llmModel", chain: options.chain };
  }
  const candidateSummaries = options.chain.candidates.slice(0, 16).map((candidate) => ({
    skillId: candidate.skillId,
    name: candidate.name,
    score: candidate.score,
    reasons: candidate.reasons,
    domains: options.cards.find((card) => card.id === candidate.skillId)?.domains ?? []
  }));
  const content = await callChatCompletions({
    baseUrl: options.baseUrl,
    path: options.path,
    apiKey: options.apiKey,
    model: options.model,
    messages: [
      { role: "system", content: "Rerank skill candidates for a coding agent. Return JSON array of {skillId, score, reason}. Do not invent skillIds." },
      { role: "user", content: JSON.stringify({ task: options.task, candidates: candidateSummaries }) }
    ]
  });
  const rows = parseJsonArray(content);
  const allowed = new Set(options.chain.candidates.map((candidate) => candidate.skillId));
  const scoreById = new Map<string, number>();
  const reasonById = new Map<string, string>();
  for (const row of rows) {
    const skillId = String(row.skillId ?? "");
    if (!allowed.has(skillId)) continue;
    const score = Number(row.score);
    if (Number.isFinite(score)) scoreById.set(skillId, Math.max(0, Math.min(1, score)));
    if (row.reason) reasonById.set(skillId, String(row.reason));
  }
  if (!scoreById.size) return { applied: false, reason: "LLM returned no usable skillIds", chain: options.chain };
  return {
    applied: true,
    reason: "LLM rerank applied",
    chain: {
      ...options.chain,
      candidates: options.chain.candidates.map((candidate) => {
        const score = scoreById.get(candidate.skillId);
        if (score === undefined) return candidate;
        return {
          ...candidate,
          score,
          skipped: score < 0.3,
          skipReason: score < 0.3 ? "score below selection threshold 0.3 after LLM rerank" : undefined,
          reasons: [...candidate.reasons, `LLM rerank: ${reasonById.get(candidate.skillId) ?? "no reason provided"}`]
        };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    }
  };
}

async function createEmbeddings(baseUrl: string, apiKey: string, model: string, input: string[]): Promise<number[][]> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input,
      encoding_format: "float"
    })
  });
  if (!response.ok) {
    throw new Error(`embedding request failed: HTTP ${response.status}`);
  }
  const json = await response.json() as { data?: Array<{ embedding?: number[] }> };
  const vectors = json.data?.map((item) => item.embedding).filter((item): item is number[] => Array.isArray(item)) ?? [];
  if (vectors.length !== input.length) {
    throw new Error(`embedding response count mismatch: expected ${input.length}, got ${vectors.length}`);
  }
  return vectors;
}

async function callChatCompletions(options: {
  baseUrl: string;
  path: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}): Promise<string> {
  const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}${options.path.startsWith("/") ? options.path : `/${options.path}`}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: 0
    })
  });
  if (!response.ok) throw new Error(`chat completions request failed: HTTP ${response.status}`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("chat completions response missing content");
  return content;
}

function parseJsonArray(text: string): any[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  return Array.isArray(parsed) ? parsed : [];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    dot += a[index] * b[index];
    aNorm += a[index] * a[index];
    bNorm += b[index] * b[index];
  }
  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function withEnhancement(chain: SkillChain, enhancement: EnhancedSkillChain["enhancement"]): EnhancedSkillChain {
  return { ...chain, enhancement };
}
