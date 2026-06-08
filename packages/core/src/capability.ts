import type { CapabilityValidationResult, InstalledSkill, SkillCapabilityCard, SkillDomain } from "./types.js";

const DOMAIN_KEYWORDS: Record<SkillDomain, string[]> = {
  ui: ["ui", "frontend", "interface", "component", "layout", "screen", "xaml", "界面", "前端", "页面", "控件"],
  design: ["design", "figma", "mockup", "visual", "style", "bitmap", "screenshot-to-redesign", "设计", "视觉", "原型", "参考图"],
  browser: ["browser", "playwright", "navigation", "click", "localhost", "ui-flow"],
  screenshot: ["screenshot", "capture", "pixel", "visual qa"],
  security: ["security", "threat", "auth", "secret", "upload", "abuse", "privacy", "token"],
  deployment: ["deploy", "deployment", "vercel", "render", "netlify", "cloudflare", "host", "publish"],
  data: ["notebook", "jupyter", "csv", "data", "chart", "analysis", "experiment", "logs"],
  document: ["pdf", "docx", "document", "spreadsheet", "presentation", "manual", "contract"],
  cli: ["cli", "command-line", "terminal", "subcommand", "command line"],
  "windows-app": ["winui", "windows app", "desktop app", "xaml", "native desktop"],
  openai: ["openai", "codex", "model", "responses api", "agents", "chatgpt"],
  github: ["github", "ci", "actions", "pull request", "review comments"],
  notion: ["notion", "knowledge", "research documentation"],
  openclaw: ["openclaw", "acp", "gateway", "claw"],
  mcp: ["mcp", "model context protocol", "progressive discovery", "tool schema"],
  general: []
};

export function deriveCapabilityCard(skill: InstalledSkill): SkillCapabilityCard {
  const haystack = `${skill.name} ${skill.description}`.toLowerCase();
  const domains = inferDomains(skill.name, haystack);

  const risk = domains.includes("deployment") || domains.includes("security")
    ? "high"
    : domains.includes("browser") || domains.includes("mcp")
      ? "medium"
      : "low";

  const requiresCredentials =
    /\b(api key|token|auth|credential|login|notion|github|vercel|render|openai)\b/i.test(skill.description);

  const verificationStrength =
    domains.includes("browser") || domains.includes("screenshot") ? "high" :
    domains.includes("security") || domains.includes("deployment") ? "medium" :
    "low";

  return {
    id: skill.id,
    name: skill.name,
    path: skill.path,
    source: skill.source,
    description: skill.description,
    domains,
    triggers: extractTriggers(skill.name, skill.description, domains),
    inputs: inferInputs(domains),
    outputs: inferOutputs(domains),
    sideEffects: inferSideEffects(domains),
    risk,
    requiresCredentials,
    verificationStrength,
    clientCompatibility: inferClientCompatibility(haystack),
    confidence: Math.min(1, 0.35 + domains.length * 0.12 + (skill.description ? 0.25 : 0))
  };
}

function inferDomains(name: string, haystack: string): SkillDomain[] {
  if (/^(autonomous-skill-orchestrator|skillos|skill-router|skill-orchestrator)$/.test(name)) {
    return ["mcp", "general"];
  }
  const named = inferDomainsFromName(name);
  if (named) return named;

  const domains = Object.entries(DOMAIN_KEYWORDS)
    .filter(([domain, keywords]) => domain === "general" ? false : keywords.some((keyword) => hasKeyword(haystack, keyword)))
    .map(([domain]) => domain as SkillDomain);
  if (domains.length === 0) domains.push("general");
  return domains;
}

function inferDomainsFromName(name: string): SkillDomain[] | null {
  if (name.includes("playwright")) return ["browser", "ui", "screenshot"];
  if (name === "screenshot") return ["screenshot"];
  if (name.includes("gpt-image") || name.includes("imagegen")) return ["design", "ui"];
  if (name.includes("figma")) return ["design", "ui"];
  if (name.includes("security")) return ["security"];
  if (name.includes("deploy") || name.includes("vercel") || name.includes("render") || name.includes("netlify") || name.includes("cloudflare")) return ["deployment"];
  if (name.includes("jupyter") || name.includes("notebook")) return ["data"];
  if (name.includes("pdf") || name.includes("document") || name.includes("spreadsheet") || name.includes("presentation")) return ["document"];
  if (name.includes("cli")) return ["cli"];
  if (name.includes("winui")) return ["windows-app", "ui"];
  if (name.includes("openai-docs")) return ["openai"];
  if (name.startsWith("gh-") || name.includes("github")) return ["github"];
  if (name.includes("notion")) return ["notion", "document"];
  if (name.includes("openclaw")) return ["openclaw", "mcp"];
  if (name.includes("mcp")) return ["mcp"];
  return null;
}

export function deriveCapabilityCards(skills: InstalledSkill[]): SkillCapabilityCard[] {
  return skills.map(deriveCapabilityCard);
}

export function validateCapabilityCard(card: SkillCapabilityCard): CapabilityValidationResult {
  const issues: CapabilityValidationResult["issues"] = [];
  if (!card.id.trim()) issues.push({ field: "id", severity: "error", message: "Capability id is empty." });
  if (!card.name.trim()) issues.push({ field: "name", severity: "error", message: "Capability name is empty." });
  if (!card.description.trim()) issues.push({ field: "description", severity: "warning", message: "Capability description is empty; routing confidence will be lower." });
  if (!card.domains.length) issues.push({ field: "domains", severity: "error", message: "Capability has no domains." });
  if (!card.triggers.length) issues.push({ field: "triggers", severity: "warning", message: "Capability has no triggers." });
  if (card.confidence < 0 || card.confidence > 1) issues.push({ field: "confidence", severity: "error", message: "Confidence must be between 0 and 1." });
  return {
    skillId: card.id,
    ok: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

export function validateCapabilityCards(cards: SkillCapabilityCard[]): CapabilityValidationResult[] {
  return cards.map(validateCapabilityCard);
}

function extractTriggers(name: string, description: string, domains: SkillDomain[]): string[] {
  const words = new Set<string>();
  for (const part of name.split(/[-_\s]+/)) if (part.length > 2) words.add(part.toLowerCase());
  const quoted = description.match(/"([^"]{3,60})"|'([^']{3,60})'|`([^`]{3,60})`/g) ?? [];
  for (const value of quoted.slice(0, 12)) words.add(value.replace(/["'`]/g, "").toLowerCase());
  for (const domain of domains) {
    for (const keyword of DOMAIN_KEYWORDS[domain].slice(0, 8)) words.add(keyword);
  }
  return [...words].slice(0, 32);
}

function hasKeyword(haystack: string, keyword: string): boolean {
  const normalized = keyword.toLowerCase();
  if (normalized.includes(" ")) return haystack.includes(normalized);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`, "i").test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferInputs(domains: SkillDomain[]): string[] {
  const inputs = new Set<string>(["task"]);
  if (domains.includes("ui") || domains.includes("browser")) inputs.add("url-or-local-app");
  if (domains.includes("document")) inputs.add("file-path");
  if (domains.includes("deployment")) inputs.add("repo-root");
  if (domains.includes("security")) inputs.add("codebase-path");
  if (domains.includes("data")) inputs.add("dataset-or-log");
  return [...inputs];
}

function inferOutputs(domains: SkillDomain[]): string[] {
  const outputs = new Set<string>(["guidance"]);
  if (domains.includes("browser")) outputs.add("browser-evidence");
  if (domains.includes("screenshot")) outputs.add("screenshot");
  if (domains.includes("deployment")) outputs.add("deployment-plan-or-link");
  if (domains.includes("security")) outputs.add("risk-findings");
  if (domains.includes("data")) outputs.add("analysis-report");
  return [...outputs];
}

function inferSideEffects(domains: SkillDomain[]): string[] {
  const effects = new Set<string>();
  if (domains.includes("browser")) effects.add("opens-browser");
  if (domains.includes("deployment")) effects.add("may-create-external-deployment");
  if (domains.includes("security")) effects.add("may-read-sensitive-code");
  if (domains.includes("document") || domains.includes("data")) effects.add("may-read-local-files");
  return [...effects];
}

function inferClientCompatibility(haystack: string): string[] {
  const clients = new Set<string>(["codex"]);
  for (const client of ["claude-code", "cursor", "windsurf", "openhands", "openclaw"]) {
    if (haystack.includes(client.replace("-", " ")) || haystack.includes(client)) clients.add(client);
  }
  return [...clients];
}
