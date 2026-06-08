import { randomUUID } from "node:crypto";
import { mkdir, appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSkillOSDir } from "./paths.js";
import type { DecisionTrace, RoutingExplanation, RoutingMemory } from "./types.js";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
  /\b(token|api[_-]?key|password|secret)\s*[:=]\s*["']?[^"',\s]+/gi
];

export function redact(value: string): string {
  let text = value;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match) => {
      const prefix = match.match(/^(token|api[_-]?key|password|secret)\s*[:=]/i)?.[0];
      return prefix ? `${prefix}<redacted>` : "<redacted>";
    });
  }
  return text;
}

export async function recordDecisionTrace(root: string, trace: Omit<DecisionTrace, "id" | "timestamp">): Promise<DecisionTrace> {
  const dir = getSkillOSDir(root);
  await mkdir(dir, { recursive: true });
  const fullTrace: DecisionTrace = {
    ...trace,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    task: redact(trace.task)
  };
  await appendFile(join(dir, "decision-log.jsonl"), `${JSON.stringify(fullTrace)}\n`, "utf8");
  return fullTrace;
}

export async function recordUserFeedback(root: string, decisionId: string, correction: string): Promise<RoutingMemory> {
  const dir = getSkillOSDir(root);
  await mkdir(dir, { recursive: true });
  const memoryPath = join(dir, "routing-memory.json");
  const memory = await readRoutingMemoryFile(memoryPath);
  const redactedCorrection = redact(correction);
  memory.preferences.push({
    pattern: `decision:${decisionId}`,
    prefer: extractList(redactedCorrection, /\bprefer\s+([a-z0-9:_-]+)/gi),
    avoid: extractList(redactedCorrection, /\bavoid\s+([a-z0-9:_-]+)/gi),
    reason: redactedCorrection
  });
  await writeFile(memoryPath, `${JSON.stringify(memory, null, 2)}\n`, "utf8");
  await recordDecisionTrace(root, {
    task: `feedback:${decisionId}:${redactedCorrection}`,
    repoSignals: null,
    candidates: [],
    selectedSkillIds: [],
    skippedSkillIds: [],
    outcome: "feedback",
    safetyProfile: "approve"
  });
  return memory;
}

export async function readRoutingMemory(root: string): Promise<RoutingMemory> {
  return readRoutingMemoryFile(join(getSkillOSDir(root), "routing-memory.json"));
}

export async function readDecisionLog(root: string, limit = 50): Promise<DecisionTrace[]> {
  try {
    const path = join(getSkillOSDir(root), "decision-log.jsonl");
    const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean);
    return lines.slice(Math.max(0, lines.length - limit)).map((line) => JSON.parse(line) as DecisionTrace);
  } catch {
    return [];
  }
}

export async function explainLastDecision(root: string): Promise<RoutingExplanation | null> {
  const traces = await readDecisionLog(root, 1);
  const trace = traces[0];
  if (!trace) return null;
  return {
    decisionId: trace.id,
    task: trace.task,
    selectedSkillIds: trace.selectedSkillIds,
    skippedSkillIds: trace.skippedSkillIds,
    safetyProfile: trace.safetyProfile,
    topCandidates: trace.candidates.slice(0, 8),
    summary: trace.outcome ?? `Selected ${trace.selectedSkillIds.length} skill(s).`
  };
}

async function readRoutingMemoryFile(path: string): Promise<RoutingMemory> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as RoutingMemory;
    return {
      version: 1,
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : []
    };
  } catch {
    return { version: 1, preferences: [] };
  }
}

function extractList(text: string, pattern: RegExp): string[] {
  const values = new Set<string>();
  for (const match of text.matchAll(pattern)) values.add(match[1]);
  return [...values];
}
