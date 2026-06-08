import { randomUUID } from "node:crypto";
import type {
  RepoSignals,
  RoutingMemory,
  SafetyProfile,
  SkillCandidate,
  SkillCapabilityCard,
  SkillChain,
  SkillChainStep,
  SkillDomain,
  SkillGap,
  TaskPhase
} from "./types.js";

const TASK_DOMAIN_KEYWORDS: Record<SkillDomain, string[]> = {
  ui: [
    "ui", "front", "frontend", "page", "screen", "interface", "layout", "button", "form", "dashboard",
    "settings page", "sidebar", "navigation", "table page", "mobile layout", "responsive layout", "control panel",
    "admin panel", "app shell", "view", "界面", "前端", "页面", "布局", "按钮", "表单", "仪表盘", "侧边栏", "导航"
  ],
  design: [
    "design", "beautiful", "professional", "mockup", "visual", "figma", "polish", "polished", "ugly",
    "prototype", "visual direction", "visual target", "reference", "high-fidelity", "look like", "real product",
    "rough", "compact", "cleaner", "confusing",
    "finished", "easier to scan", "visual hierarchy", "spacing looks bad", "amateur", "设计", "好看", "专业",
    "视觉", "原型", "参考图", "丑", "美化", "高级", "产品级"
  ],
  browser: [
    "browser", "localhost", "click", "flow", "test page", "open page", "playwright", "open localhost",
    "browser-test", "browser checks", "main flow", "clickable", "浏览器", "本地页面", "打开页面", "点一下", "测试流程"
  ],
  screenshot: [
    "screenshot", "capture", "looks", "visual", "overflow", "compare screenshots", "before-after",
    "screenshot qa", "截图", "截屏", "溢出", "错位", "对比截图"
  ],
  security: [
    "safe", "secure", "security", "threat", "threat model", "auth", "login", "upload", "secret", "secrets",
    "token", "privacy", "abuse", "attackers", "attacker", "leak", "leaks", "exposed", "exposure",
    "access-control", "access control", "rate limiting", "webhook", "session", "cookies", "credential",
    "credentials", "trusts client", "unsafe redirect", "path handling", "public api abuse", "destructive",
    "api key", "api keys", "uploaded files", "execute code", "before sharing", "sharing it with users",
    "threats", "payments", "callbacks", "attack", "attackers could", "secure by default", "privacy risks",
    "安全", "威胁", "登录", "上传", "密钥", "泄露", "隐私", "攻击", "滥用", "权限", "会话", "cookie"
  ],
  deployment: [
    "deploy", "deployment", "deployable", "publish", "host", "hosting", "online", "vercel", "render",
    "release", "live", "cloud", "preview deployment", "public preview", "static site", "put online",
    "link",
    "build failed", "cannot start", "environment variables", "worker deployable", "部署", "上线", "发布",
    "托管", "预览部署", "云端", "网址", "live link"
  ],
  data: [
    "data", "dataset", "csv", "log", "logs", "chart", "charts", "analyze", "analysis", "statistics",
    "notebook", "jupyter", "experiment", "outliers", "metrics", "benchmark", "daily counts", "error rates",
    "result files", "reproducible exploration", "input cases", "failed most",
    "correlations", "measurements", "rows", "telemetry", "usage data", "trends", "anomalies", "数据",
    "表格", "日志", "图表", "统计", "分析", "异常值", "指标", "实验", "笔记本"
  ],
  document: [
    "pdf", "document", "documents", "docx", "spreadsheet", "contract", "manual", "report", "guide",
    "requirements", "spec", "specification", "notes", "meeting notes", "legal", "paper", "brief",
    "citations", "extract tables", "form fields", "deadlines", "文档", "合同", "手册", "报告", "需求",
    "说明书", "规范", "论文", "会议记录", "引用"
  ],
  cli: [
    "cli", "command", "commands", "command-line", "terminal", "batch", "script", "tool", "subcommands",
    "json-first", "returns json", "scriptable", "automation cli", "from terminal", "命令行", "终端",
    "脚本", "批处理", "子命令", "工具"
  ],
  "windows-app": [
    "winui", "windows app", "desktop app", "xaml", "installer", "windows app sdk", "c# desktop",
    "native desktop", "native window", "desktop window", "windows native", "winui 3", "桌面应用",
    "windows desktop", "desktop form", "windows", "c#", "csharp",
    "windows 应用", "原生窗口", "安装包"
  ],
  openai: [
    "openai", "codex", "model", "models", "responses api", "agents sdk", "chatgpt", "official docs",
    "current docs", "latest docs", "tool calling", "structured outputs", "realtime api", "audio api",
    "official guidance", "endpoint", "stale api", "prompts", "sdk", "docs",
    "api advice", "use docs",
    "image api", "gpt image", "model migration", "sdk usage", "官方文档", "模型", "接口", "api 文档"
  ],
  github: [
    "github", "ci", "actions", "github actions", "pull request", "pr", "review comment", "review comments",
    "workflow yaml", "checks are red", "build log", "failing build", "release workflow",
    "deployment action", "ci job", "pr checks", "reviewer", "tests", "requested changes",
    "branch protection", "matrix", "reviewer feedback", "lint errors", "pull request green", "ci logs",
    "github action", "流水线", "工作流", "拉取请求", "评审意见", "构建日志"
  ],
  notion: ["notion", "research", "knowledge base", "workspace notes", "notion 文档", "知识库"],
  openclaw: [
    "openclaw", "openclaw-like", "claw", "acp", "gateway", "clawhub", "native plugin", "plugin packaging",
    "hooks", "openclaw plugin", "claw variant", "openclaw 变体"
  ],
  mcp: [
    "mcp", "model context protocol", "tool server", "mcp server", "mcp tool", "tool schema",
    "progressive discovery", "render_skill_context", "recommend_skill_chain", "search_skills", "json-rpc",
    "stdio server"
  ],
  general: []
};

const NEGATION_TERMS = [
  "do not", "don't", "dont", "not", "without", "skip", "avoid", "no ", "不要", "不用", "别", "先不", "暂不", "跳过"
];

const DOMAIN_THRESHOLDS: Partial<Record<SkillDomain, number>> = {
  browser: 0.25,
  screenshot: 0.25,
  deployment: 0.25,
  security: 0.25,
  mcp: 0.25,
  openclaw: 0.25,
  "windows-app": 0.25
};

const DEFAULT_SELECTION_THRESHOLD = 0.25;

export interface RecommendOptions {
  task: string;
  cards: SkillCapabilityCard[];
  repoSignals?: RepoSignals | null;
  phase?: TaskPhase;
  safetyProfile?: SafetyProfile;
  routingMemory?: RoutingMemory | null;
}

interface DomainEvidence {
  hits: string[];
  negated: boolean;
}

export function recommendSkillChain(options: RecommendOptions): SkillChain {
  const phase = options.phase ?? "intake";
  const safetyProfile = options.safetyProfile ?? "approve";
  const candidates = scoreCandidates(options.task, options.cards, options.repoSignals ?? null, phase, options.routingMemory ?? null);
  const selected = candidates.filter((candidate) => !candidate.skipped).slice(0, 8);
  const gaps = detectSkillGaps(options.task, options.cards);
  const steps = planSteps(options.task, selected, safetyProfile);
  return {
    id: randomUUID(),
    task: options.task,
    safetyProfile,
    candidates,
    steps,
    gaps,
    summary: summarizeChain(selected, gaps)
  };
}

export function scoreCandidates(
  task: string,
  cards: SkillCapabilityCard[],
  repoSignals: RepoSignals | null,
  phase: TaskPhase,
  routingMemory: RoutingMemory | null = null
): SkillCandidate[] {
  const normalizedTask = normalizeTask(task);
  const taskEvidence = detectTaskDomains(normalizedTask);
  const phaseDomains = phaseToDomains(phase);
  const clientMentions = mentionedClients(normalizedTask);

  const candidates = cards.map((card) => {
    let score = 0;
    let repoMatched = false;
    const reasons: string[] = [];
    const matchedDomains = new Set<SkillDomain>();

    for (const domain of card.domains) {
      const evidence = taskEvidence.get(domain);
      if (evidence?.hits.length) {
        const domainScore = Math.min(0.58, evidence.hits.length * 0.16);
        score += domainScore;
        matchedDomains.add(domain);
        reasons.push(`task matches ${domain}: ${evidence.hits.slice(0, 5).join(", ")}`);
      }
      if (evidence?.negated) {
        score -= 0.48;
        reasons.push(`task negates ${domain}`);
      }
      const related = relatedDomainExpansion(domain, card, taskEvidence, phase);
      if (related > 0 && !matchedDomains.has(domain) && !evidence?.negated) {
        score += related;
        matchedDomains.add(domain);
        reasons.push(`related workflow implies ${domain}`);
      }
    }

    const triggerHits = card.triggers
      .filter((trigger) => trigger.length > 2 && hasKeyword(normalizedTask, trigger.toLowerCase()))
      .slice(0, 5);
    if (triggerHits.length) {
      const triggerScore = Math.min(0.18, triggerHits.length * 0.06);
      score += triggerScore;
      for (const domain of card.domains) {
        if (taskEvidence.get(domain)?.hits.length) matchedDomains.add(domain);
      }
      reasons.push(`trigger matched: ${triggerHits.join(", ")}`);
    }

    const repoBoost = repoSignals ? repoSignalBoost(card, repoSignals) : { score: 0, domains: [] as SkillDomain[] };
    if (repoBoost.score > 0) {
      score += repoBoost.score;
      repoMatched = true;
      for (const domain of repoBoost.domains) matchedDomains.add(domain);
      reasons.push(`repo signals matched: ${repoSignals?.frameworks.concat(repoSignals.deployTargets, repoSignals.languages).join(", ")}`);
    }

    if (phaseDomains.some((domain) => card.domains.includes(domain))) {
      const hasTaskOrRepoEvidence = matchedDomains.size > 0 || repoMatched;
      if (hasTaskOrRepoEvidence) {
        score += 0.06;
        reasons.push(`phase ${phase} reinforces matched domain`);
      }
    }

    const memoryAdjustment = routingMemoryAdjustment(card, normalizedTask, routingMemory);
    if (memoryAdjustment.score !== 0) {
      score += memoryAdjustment.score;
      reasons.push(memoryAdjustment.reason);
      if (memoryAdjustment.score > 0) for (const domain of card.domains) matchedDomains.add(domain);
    }

    score += Math.min(0.08, Math.max(0.02, card.confidence * 0.06));
    const mismatchPenalty = specializedMismatchPenalty(card, normalizedTask, repoSignals, phase, taskEvidence);
    const clientPenalty = clientAdapterMismatchPenalty(card, clientMentions);
    const totalPenalty = mismatchPenalty + clientPenalty;
    if (totalPenalty > 0) {
      score -= totalPenalty;
      reasons.push(`specialized domain penalty: -${totalPenalty.toFixed(2)}`);
    }

    if (!matchedDomains.size && !repoMatched && memoryAdjustment.score <= 0) {
      score = Math.min(score, 0.24);
      reasons.push("no task or repo evidence; capped below selection threshold");
    }

    const rounded = Number(Math.max(0, Math.min(score, 1)).toFixed(3));
    const threshold = thresholdFor(card, matchedDomains);
    const skipped = rounded < threshold;
    return {
      skillId: card.id,
      name: card.name,
      score: rounded,
      phase,
      matchedDomains: [...matchedDomains],
      reasons: reasons.length ? reasons : ["no strong task, phase, trigger, or repo match"],
      expectedBenefit: expectedBenefit([...matchedDomains].length ? [...matchedDomains] : card.domains),
      skipped,
      skipReason: skipped ? `score below selection threshold ${threshold}` : undefined
    };
  });
  return candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function detectSkillGaps(task: string, cards: SkillCapabilityCard[]): SkillGap[] {
  const normalizedTask = normalizeTask(task);
  const installedDomains = new Set(cards.flatMap((card) => card.domains));
  const gaps: SkillGap[] = [];
  for (const [domain, evidence] of detectTaskDomains(normalizedTask)) {
    if (domain === "general" || installedDomains.has(domain) || evidence.negated || !evidence.hits.length) continue;
    gaps.push({
      domain,
      reason: `Task appears to need ${domain}, but no installed capability card covers it.`,
      suggestedSkillNames: suggestedSkillNames(domain),
      canGenerateLightweightSkill: ["cli", "document", "data"].includes(domain)
    });
  }
  return gaps;
}

function planSteps(task: string, selected: SkillCandidate[], safetyProfile: SafetyProfile): SkillChainStep[] {
  const byDomain = new Map<SkillDomain, string[]>();
  for (const candidate of selected) {
    const domains = candidate.matchedDomains.length ? candidate.matchedDomains : inferCandidateDomains(candidate);
    for (const domain of domains) byDomain.set(domain, [...(byDomain.get(domain) ?? []), candidate.skillId]);
  }

  const steps: SkillChainStep[] = [];
  const addStep = (phase: TaskPhase, domains: SkillDomain[], title: string, objective: string, outputs: string[], risk: "low" | "medium" | "high") => {
    const skillIds = [...new Set(domains.flatMap((domain) => byDomain.get(domain) ?? []))];
    if (!skillIds.length) return;
    steps.push({
      id: randomUUID(),
      phase,
      skillIds,
      title,
      objective,
      expectedOutputs: outputs,
      requiresApproval: requiresApproval(safetyProfile, risk),
      risk
    });
  };

  addStep("planning", ["design", "ui", "document", "data", "openai"], "Plan with specialized context", "Load relevant skill context and plan the task.", ["decision-ready plan"], "low");
  addStep("implementation", ["cli", "windows-app", "ui", "mcp", "openclaw"], "Implement with domain workflow", "Use selected implementation skills for the concrete build.", ["code or generated presets"], "medium");
  addStep("verification", ["browser", "screenshot", "data", "github"], "Verify evidence", "Run the strongest available verification workflow.", ["test results", "screenshots", "logs"], "medium");
  addStep("security-review", ["security"], "Review risk", "Check security-sensitive choices before final delivery.", ["risk findings", "mitigations"], "high");
  addStep("deployment", ["deployment"], "Prepare deployment", "Render deployment instructions or perform deployment under policy.", ["deployment config or link"], "high");

  if (!steps.length) {
    steps.push({
      id: randomUUID(),
      phase: "planning",
      skillIds: selected.slice(0, 3).map((candidate) => candidate.skillId),
      title: "General skill-assisted plan",
      objective: `Use selected skills to support: ${task}`,
      expectedOutputs: ["guided result"],
      requiresApproval: false,
      risk: "low"
    });
  }
  return steps;
}

function detectTaskDomains(normalizedTask: string): Map<SkillDomain, DomainEvidence> {
  const result = new Map<SkillDomain, DomainEvidence>();
  for (const [domain, keywords] of Object.entries(TASK_DOMAIN_KEYWORDS) as Array<[SkillDomain, string[]]>) {
    const hits = keywords.filter((keyword) => hasKeyword(normalizedTask, keyword));
    const negated = hits.some((keyword) => isNegated(normalizedTask, keyword));
    result.set(domain, { hits, negated });
  }
  return result;
}

function isNegated(task: string, keyword: string): boolean {
  const index = task.indexOf(keyword.toLowerCase());
  if (index < 0) return false;
  const before = task.slice(Math.max(0, index - 18), index);
  if (/\b(do not|don't|dont)\s+know\b/.test(before)) return false;
  if (before.includes("不知道")) return false;
  return /\b(do not|don't|dont|without|skip|avoid|not|no)\b/.test(before)
    || NEGATION_TERMS.some((term) => /[^\x00-\x7F]/.test(term) && before.includes(term));
}

function relatedDomainExpansion(
  domain: SkillDomain,
  card: SkillCapabilityCard,
  taskEvidence: Map<SkillDomain, DomainEvidence>,
  phase: TaskPhase
): number {
  const has = (value: SkillDomain) => Boolean(taskEvidence.get(value)?.hits.length);
  const isWebUiTask = (has("ui") || has("design") || has("screenshot")) && !has("windows-app");
  if (phase === "implementation" && isWebUiTask && card.domains.includes(domain)) {
    if (domain === "design" || domain === "ui") return 0.12;
    if (domain === "browser" || domain === "screenshot") return 0.14;
  }
  if ((has("openclaw") || has("mcp")) && card.domains.includes("openclaw") && card.domains.includes("mcp")) {
    if (domain === "openclaw" || domain === "mcp") return 0.14;
  }
  return 0;
}

function normalizeTask(task: string): string {
  return task
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[’]/g, "'")
    .replace(/\bpr\b/g, " pull request ")
    .replace(/\bci\b/g, " ci ");
}

function thresholdFor(card: SkillCapabilityCard, matchedDomains: Set<SkillDomain>): number {
  const thresholds = [...matchedDomains].map((domain) => DOMAIN_THRESHOLDS[domain] ?? DEFAULT_SELECTION_THRESHOLD);
  if (!thresholds.length) return DEFAULT_SELECTION_THRESHOLD;
  const base = Math.min(...thresholds);
  if (card.source === "tool" && card.id.startsWith("client-adapter:")) return Math.max(base, 0.36);
  return base;
}

function mentionedClients(normalizedTask: string): Set<string> {
  const aliases: Record<string, string[]> = {
    codex: ["codex"],
    "claude-code": ["claude", "claude code"],
    cursor: ["cursor"],
    windsurf: ["windsurf", "cascade"],
    openhands: ["openhands", "open hands"],
    openclaw: ["openclaw", "openclaw-like", "claw", "acp", "gateway"]
  };
  const result = new Set<string>();
  for (const [client, keywords] of Object.entries(aliases)) {
    if (keywords.some((keyword) => hasKeyword(normalizedTask, keyword))) result.add(client);
  }
  return result;
}

function clientAdapterMismatchPenalty(card: SkillCapabilityCard, clientMentions: Set<string>): number {
  if (!card.id.startsWith("client-adapter:")) return 0;
  const client = card.id.split(":")[1];
  if (!clientMentions.size) return 0.18;
  return clientMentions.has(client) ? 0 : 0.34;
}

function specializedMismatchPenalty(
  card: SkillCapabilityCard,
  normalizedTask: string,
  repoSignals: RepoSignals | null,
  phase: TaskPhase,
  taskEvidence: Map<SkillDomain, DomainEvidence>
): number {
  let penalty = 0;
  const has = (domain: SkillDomain) => Boolean(taskEvidence.get(domain)?.hits.length);
  const negated = (domain: SkillDomain) => Boolean(taskEvidence.get(domain)?.negated);
  const strongClientOrProtocolTask = has("openclaw") || has("mcp") || has("openai") || has("github");

  if (card.domains.includes("windows-app") && !has("windows-app") && !repoSignals?.languages.includes("csharp")) penalty += 0.42;
  if ((card.domains.includes("browser") || card.domains.includes("screenshot")) && !has("browser") && !has("screenshot") && (has("github") || has("windows-app"))) penalty += 0.36;
  if (card.domains.includes("deployment") && (!has("deployment") || negated("deployment")) && !repoSignals?.deployTargets.length && phase !== "deployment") penalty += 0.22;
  if (card.domains.includes("security") && (!has("security") || negated("security")) && phase !== "security-review") penalty += 0.18;
  if (card.domains.includes("cli") && !has("cli") && (has("mcp") || has("openclaw"))) penalty += 0.24;
  if (card.domains.includes("cli") && !has("cli")) penalty += 0.1;
  if (card.domains.includes("notion") && !has("notion")) penalty += 0.16;
  if (card.domains.includes("openclaw") && !has("openclaw") && !has("mcp")) penalty += 0.3;
  if (card.domains.includes("mcp") && !has("mcp") && !has("openclaw")) penalty += 0.18;
  if ((card.domains.includes("design") || card.domains.includes("ui")) && !card.domains.includes("windows-app") && strongClientOrProtocolTask && !has("ui") && !has("design")) penalty += 0.28;
  if ((card.domains.includes("design") || card.domains.includes("browser") || card.domains.includes("screenshot")) && has("windows-app") && !card.domains.includes("windows-app")) penalty += 0.28;
  if (card.name === "autonomous-skill-orchestrator" && !hasKeyword(normalizedTask, "autonomous-skill-orchestrator") && !hasKeyword(normalizedTask, "skill orchestrator")) penalty += 0.3;
  return Math.min(0.55, penalty);
}

function routingMemoryAdjustment(card: SkillCapabilityCard, normalizedTask: string, routingMemory: RoutingMemory | null): { score: number; reason: string } {
  if (!routingMemory?.preferences.length) return { score: 0, reason: "" };
  let score = 0;
  const reasons: string[] = [];
  for (const preference of routingMemory.preferences) {
    const pattern = preference.pattern.toLowerCase();
    const applies = pattern.startsWith("decision:") || pattern.length < 3 ? true : hasKeyword(normalizedTask, pattern);
    if (!applies) continue;
    if (preference.prefer.includes(card.id) || preference.prefer.includes(card.name)) {
      score += 0.18;
      reasons.push(`routing memory prefers ${card.name}`);
    }
    if (preference.avoid.includes(card.id) || preference.avoid.includes(card.name)) {
      score -= 0.24;
      reasons.push(`routing memory avoids ${card.name}`);
    }
  }
  return { score, reason: reasons.join("; ") };
}

function inferCandidateDomains(candidate: SkillCandidate): SkillDomain[] {
  const text = `${candidate.name} ${candidate.reasons.join(" ")}`.toLowerCase();
  return (Object.keys(TASK_DOMAIN_KEYWORDS) as SkillDomain[]).filter((domain) =>
    TASK_DOMAIN_KEYWORDS[domain].some((keyword) => hasKeyword(text, keyword))
  );
}

function phaseToDomains(phase: TaskPhase): SkillDomain[] {
  switch (phase) {
    case "implementation": return ["ui", "cli", "windows-app", "mcp", "openclaw"];
    case "verification": return ["browser", "screenshot", "data", "github"];
    case "deployment": return ["deployment"];
    case "security-review": return ["security"];
    case "repo-inspection": return ["github", "deployment", "security", "document"];
    case "planning": return ["design", "document", "openai", "notion", "data"];
    default: return ["general"];
  }
}

function repoSignalBoost(card: SkillCapabilityCard, repoSignals: RepoSignals): { score: number; domains: SkillDomain[] } {
  let score = 0;
  const domains = new Set<SkillDomain>();
  if (card.domains.includes("deployment") && repoSignals.deployTargets.length) {
    score += 0.18;
    domains.add("deployment");
  }
  if (card.name.includes("vercel") && repoSignals.deployTargets.includes("vercel")) {
    score += 0.22;
    domains.add("deployment");
  }
  if (card.name.includes("render") && repoSignals.deployTargets.includes("render")) {
    score += 0.22;
    domains.add("deployment");
  }
  if (card.domains.includes("windows-app") && repoSignals.languages.includes("csharp")) {
    score += 0.18;
    domains.add("windows-app");
  }
  if (card.domains.includes("ui") && repoSignals.frameworks.some((value) => ["react", "next", "vite", "svelte", "vue"].includes(value))) {
    score += 0.12;
    domains.add("ui");
  }
  if (card.domains.includes("mcp") && repoSignals.frameworks.includes("mcp")) {
    score += 0.2;
    domains.add("mcp");
  }
  if (card.domains.includes("openclaw") && repoSignals.frameworks.includes("openclaw")) {
    score += 0.2;
    domains.add("openclaw");
  }
  return { score, domains: [...domains] };
}

function expectedBenefit(domains: SkillDomain[]): string {
  if (domains.includes("browser") || domains.includes("screenshot")) return "stronger verification evidence";
  if (domains.includes("security")) return "reduced security and privacy risk";
  if (domains.includes("deployment")) return "deployment-specific setup and troubleshooting";
  if (domains.includes("design") || domains.includes("ui")) return "higher-quality UI planning and implementation";
  if (domains.includes("data")) return "reproducible data or log analysis";
  return "specialized workflow guidance";
}

function requiresApproval(profile: SafetyProfile, risk: "low" | "medium" | "high"): boolean {
  if (profile === "suggest") return true;
  if (profile === "approve") return risk !== "low";
  return risk === "high";
}

function summarizeChain(selected: SkillCandidate[], gaps: SkillGap[]): string {
  const skillNames = selected.map((candidate) => candidate.name).slice(0, 6);
  const gapText = gaps.length ? ` Gaps detected: ${gaps.map((gap) => gap.domain).join(", ")}.` : "";
  return skillNames.length
    ? `Recommended ${skillNames.length} skills: ${skillNames.join(", ")}.${gapText}`
    : `No strong installed skill matches found.${gapText}`;
}

function suggestedSkillNames(domain: SkillDomain): string[] {
  const suggestions: Partial<Record<SkillDomain, string[]>> = {
    document: ["pdf", "documents", "spreadsheets"],
    deployment: ["vercel-deploy", "render-deploy", "netlify-deploy", "cloudflare-deploy"],
    security: ["security-best-practices", "security-threat-model"],
    browser: ["playwright", "playwright-interactive"],
    screenshot: ["screenshot"],
    data: ["jupyter-notebook"],
    openai: ["openai-docs"],
    github: ["gh-fix-ci", "gh-address-comments"],
    openclaw: ["openclaw-adapter"]
  };
  return suggestions[domain] ?? [`${domain}-skill`];
}

function hasKeyword(haystack: string, keyword: string): boolean {
  const normalized = keyword.toLowerCase();
  if (!normalized.trim()) return false;
  if (normalized.includes(" ") || /[^\x00-\x7F]/.test(normalized)) return haystack.includes(normalized);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`, "i").test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
