#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  defaultEvalCases,
  deriveCapabilityCards,
  detectRepoSignals,
  evaluateSafetyGate,
  explainLastDecision,
  getBuiltInCapabilityCards,
  getSkillOSDir,
  initSkillOSConfig,
  inventorySkills,
  readRoutingMemory,
  readSkillOSConfig,
  recordDecisionTrace,
  recordUserFeedback,
  recommendSkillChainEnhanced,
  runRoutingEval,
  validateCapabilityCards,
  type ClientInstallPlan,
  type PackVerificationReport,
  type SafetyProfile
} from "@skillos/core";
import { createAllAdapters, getAdapter } from "@skillos/adapters";

interface ParsedArgs {
  command: string[];
  flags: Record<string, string | boolean>;
  rest: string[];
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const [cmd, subcmd] = args.command;
  try {
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
      printHelp();
      return 0;
    }
    if (cmd === "init") return await cmdInit(args);
    if (cmd === "setup") return await cmdSetup(args);
    if (cmd === "inventory") return await cmdInventory(args);
    if (cmd === "recommend") return await cmdRecommend(args);
    if (cmd === "inspect") return await cmdInspect(args);
    if (cmd === "eval" && subcmd === "run") return await cmdEvalRun(args);
    if (cmd === "doctor") return await cmdDoctor(args);
    if (cmd === "presets") return await cmdPresets(args);
    if (cmd === "preset" && subcmd === "diff") return await cmdPresetDiff(args);
    if (cmd === "preset" && subcmd === "apply") return await cmdPresetApply(args);
    if (cmd === "explain") return await cmdExplain(args);
    if (cmd === "feedback") return await cmdFeedback(args);
    if (cmd === "pack" && subcmd === "verify") return await cmdPackVerify(args);
    throw new Error(`Unknown command: ${args.command.join(" ")}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (args.flags.format === "json") {
      console.error(JSON.stringify({ ok: false, error: { message } }, null, 2));
    } else {
      console.error(message);
    }
    return 1;
  }
}

async function cmdInit(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const safety = normalizeSafety(args.flags.safety);
  const config = await initSkillOSConfig(root, safety);
  output(args, { ok: true, root, config }, renderInitText);
  return 0;
}

async function cmdSetup(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const safety = normalizeSafety(args.flags.safety);
  const configPath = join(getSkillOSDir(root), "config.json");
  const config = existsSync(configPath) ? await readSkillOSConfig(root) : await initSkillOSConfig(root, safety);
  const clients = parseClients(args.flags.clients, createAllAdapters().map((adapter) => adapter.id));
  const plans: ClientInstallPlan[] = [];
  const diffs = [];
  const generated = [];
  for (const clientId of clients) {
    const adapter = getAdapter(clientId);
    if (!adapter) throw new Error(`Unknown adapter: ${clientId}`);
    const plan = await adapter.renderInstallPlan(root, config);
    plans.push(plan);
    diffs.push(...await adapter.diffExistingConfig(root, plan));
    for (const target of plan.targets) {
      const generatedPath = join(getSkillOSDir(root), "generated-presets", clientId, target.relativePath);
      await mkdir(dirname(generatedPath), { recursive: true });
      await writeFile(generatedPath, target.content, "utf8");
      generated.push(generatedPath);
    }
  }
  output(args, { ok: true, root, config, clients, plans, diffs, generated }, renderSetupText);
  return 0;
}

async function cmdInventory(args: ParsedArgs): Promise<number> {
  const cards = await getCards(args);
  const validation = validateCapabilityCards(cards);
  if (!args.flags["no-write"]) {
    const root = getRoot(args);
    const dir = getSkillOSDir(root);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "capabilities.json"),
      `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), cards, validation }, null, 2)}\n`,
      "utf8"
    );
  }
  output(args, { cards, validation }, renderInventoryText);
  return 0;
}

async function cmdRecommend(args: ParsedArgs): Promise<number> {
  const task = args.rest.join(" ") || String(args.flags.task ?? "");
  if (!task) throw new Error("recommend requires a task argument");
  const root = getRoot(args);
  const cards = await getCards(args);
  const repoSignals = args.flags["no-repo"] ? null : await detectRepoSignals(root);
  const config = await readSkillOSConfig(root);
  const routingMemory = await readRoutingMemory(root);
  const chain = await recommendSkillChainEnhanced({
    task,
    cards,
    repoSignals,
    phase: args.flags.phase as any,
    safetyProfile: normalizeSafety(args.flags.safety ?? config.safetyProfile),
    routingMemory,
    modelEnhancement: {
      ...config.modelEnhancement,
      enabled: Boolean(args.flags["model-enhancement"] ?? config.modelEnhancement.enabled),
      apiKeyEnv: args.flags["model-enhancement-api-key-env"] ? String(args.flags["model-enhancement-api-key-env"]) : config.modelEnhancement.apiKeyEnv,
      llmModel: args.flags["model-enhancement-llm-model"] ? String(args.flags["model-enhancement-llm-model"]) : config.modelEnhancement.llmModel,
      enableLlmRerank: Boolean(args.flags["model-enhancement-llm-rerank"] ?? config.modelEnhancement.enableLlmRerank)
    }
  });
  const selectedSkillIds = chain.candidates.filter((candidate) => !candidate.skipped).map((candidate) => candidate.skillId);
  const skippedSkillIds = chain.candidates.filter((candidate) => candidate.skipped).map((candidate) => candidate.skillId);
  const trace = await recordDecisionTrace(root, {
    task,
    repoSignals,
    candidates: chain.candidates,
    selectedSkillIds,
    skippedSkillIds,
    outcome: chain.summary,
    safetyProfile: chain.safetyProfile
  });
  output(args, { ...chain, decisionId: trace.id }, renderRecommendText);
  return 0;
}

async function cmdInspect(args: ParsedArgs): Promise<number> {
  const skillId = args.rest[0] ?? String(args.flags.skill ?? "");
  if (!skillId) throw new Error("inspect requires a skill id or name");
  const cards = await getCards(args);
  const card = cards.find((item) => item.id === skillId || item.name === skillId);
  if (!card) throw new Error(`Skill not found: ${skillId}`);
  output(args, { card }, (value) => renderInspectText(value.card));
  return 0;
}

async function cmdEvalRun(args: ParsedArgs): Promise<number> {
  const cards = await getCards(args);
  const report = runRoutingEval(String(args.flags.suite ?? "default"), defaultEvalCases, cards);
  output(args, report, renderEvalText);
  return 0;
}

async function cmdDoctor(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const config = await readSkillOSConfig(root);
  const adapters = [];
  for (const adapter of createAllAdapters()) {
    adapters.push({
      id: adapter.id,
      displayName: adapter.displayName,
      capabilities: await adapter.detectCapabilities(root).catch((err) => ({ error: err instanceof Error ? err.message : String(err) })),
      install: await adapter.verifyInstall(root).catch((err) => ({ error: err instanceof Error ? err.message : String(err) }))
    });
  }
  const cards = await getCards(args);
  const validation = validateCapabilityCards(cards);
  output(args, {
    ok: validation.every((item) => item.ok),
    root,
    config,
    inventoryCount: cards.length,
    validationWarnings: validation.reduce((count, item) => count + item.issues.filter((issue) => issue.severity === "warning").length, 0),
    adapters
  }, renderDoctorText);
  return 0;
}

async function cmdPresets(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const outDir = String(args.flags.out ?? join(root, "dist-presets"));
  const config = await readSkillOSConfig(root);
  const ids = args.rest.length ? args.rest : createAllAdapters().map((adapter) => adapter.id);
  const written: string[] = [];
  for (const id of ids) {
    const adapter = getAdapter(id);
    if (!adapter) throw new Error(`Unknown adapter: ${id}`);
    const files = await adapter.renderPreset(config);
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = join(outDir, id, relativePath);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
      written.push(filePath);
    }
  }
  output(args, { outDir, written }, renderPresetsText);
  return 0;
}

async function cmdPresetDiff(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const clientId = String(args.flags.client ?? args.rest[0] ?? "");
  if (!clientId) throw new Error("preset diff requires --client <id>");
  const adapter = getAdapter(clientId);
  if (!adapter) throw new Error(`Unknown adapter: ${clientId}`);
  const config = await readSkillOSConfig(root);
  const plan = await adapter.renderInstallPlan(root, config);
  const diffs = await adapter.diffExistingConfig(root, plan);
  output(args, { clientId, plan, diffs }, renderPresetDiffText);
  return 0;
}

async function cmdPresetApply(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const clientId = String(args.flags.client ?? args.rest[0] ?? "");
  if (!clientId) throw new Error("preset apply requires --client <id>");
  if (!args.flags.confirm) throw new Error("preset apply writes files; rerun with --confirm after reviewing preset diff");
  const adapter = getAdapter(clientId);
  if (!adapter) throw new Error(`Unknown adapter: ${clientId}`);
  const config = await readSkillOSConfig(root);
  const gate = evaluateSafetyGate({ profile: config.safetyProfile, action: "write-file", risk: "medium" });
  if (gate.decision === "blocked") throw new Error(`Safety gate blocked preset apply: ${gate.reason}`);
  const plan = await adapter.renderInstallPlan(root, config);
  const written = [];
  for (const target of plan.targets) {
    await mkdir(dirname(target.targetPath), { recursive: true });
    await writeFile(target.targetPath, target.content, "utf8");
    written.push(target.targetPath);
  }
  output(args, { ok: true, clientId, safetyDecision: gate, written }, renderPresetApplyText);
  return 0;
}

async function cmdExplain(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  if (!args.flags.last) throw new Error("explain currently supports --last");
  const explanation = await explainLastDecision(root);
  if (!explanation) throw new Error("No SkillOS decision log found.");
  output(args, explanation, renderExplainText);
  return 0;
}

async function cmdFeedback(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const decisionId = String(args.flags.decision ?? args.rest[0] ?? "");
  if (!decisionId) throw new Error("feedback requires --decision <id>");
  const correction = [
    args.flags.prefer ? `prefer ${args.flags.prefer}` : "",
    args.flags.avoid ? `avoid ${args.flags.avoid}` : "",
    args.rest.slice(decisionId === args.rest[0] ? 1 : 0).join(" ")
  ].filter(Boolean).join(" ");
  if (!correction) throw new Error("feedback requires --prefer, --avoid, or free-form correction text");
  const memory = await recordUserFeedback(root, decisionId, correction);
  output(args, { ok: true, decisionId, memory }, renderFeedbackText);
  return 0;
}

async function cmdPackVerify(args: ParsedArgs): Promise<number> {
  const root = getRoot(args);
  const zipPath = String(args.flags.zip ?? join(root, "dist", "skillos.zip"));
  const report = verifyZipListing(zipPath);
  output(args, report, renderPackVerifyText);
  return report.ok ? 0 : 1;
}

async function getCards(args: ParsedArgs) {
  const skills = await inventorySkills({
    includeSystem: Boolean(args.flags["include-system"] ?? true),
    skillsRoot: args.flags["skills-root"] ? String(args.flags["skills-root"]) : undefined
  });
  const cards = deriveCapabilityCards(skills);
  if (!args.flags["no-builtins"]) cards.push(...getBuiltInCapabilityCards());
  return cards;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value.startsWith("--")) {
      const [rawKey, inlineValue] = value.slice(2).split("=", 2);
      if (inlineValue !== undefined) {
        flags[rawKey] = inlineValue;
      } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        flags[rawKey] = argv[++index];
      } else {
        flags[rawKey] = true;
      }
    } else {
      positional.push(value);
    }
  }
  const twoWord = new Set(["eval", "preset", "pack"]);
  const commandLength = twoWord.has(positional[0] ?? "") ? 2 : 1;
  return {
    command: positional.slice(0, commandLength),
    flags,
    rest: positional.slice(commandLength)
  };
}

function normalizeSafety(value: unknown): SafetyProfile {
  if (value === "suggest" || value === "approve" || value === "auto") return value;
  return "approve";
}

function getRoot(args: ParsedArgs): string {
  return String(args.flags.root ?? process.cwd());
}

function parseClients(value: unknown, fallback: string[]): string[] {
  if (!value) return fallback;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function output<T>(args: ParsedArgs, value: T, renderText: (value: any) => string): void {
  if (args.flags.format === "json") {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(renderText(value));
}

function renderInitText(value: any): string {
  return [
    "SkillOS initialized.",
    `Root: ${value.root}`,
    `Safety: ${value.config.safetyProfile}`,
    "Local data stays under .skillos/."
  ].join("\n");
}

function renderSetupText(value: any): string {
  const lines = [
    "SkillOS setup generated client presets.",
    `Root: ${value.root}`,
    `Clients: ${value.clients.join(", ")}`,
    `Generated files: ${value.generated.length}`,
    "",
    "Planned client config changes:"
  ];
  for (const diff of value.diffs) lines.push(`- ${diff.action}: ${diff.targetPath}`);
  lines.push("", "Review with: skillos preset diff --client <id>");
  lines.push("Apply with: skillos preset apply --client <id> --confirm");
  return lines.join("\n");
}

function renderInventoryText(value: any): string {
  const warnings = value.validation.reduce((count: number, item: any) => count + item.issues.filter((issue: any) => issue.severity === "warning").length, 0);
  const domains = new Map<string, number>();
  for (const card of value.cards) for (const domain of card.domains) domains.set(domain, (domains.get(domain) ?? 0) + 1);
  return [
    `Found ${value.cards.length} capability cards.`,
    `Validation warnings: ${warnings}`,
    `Domains: ${[...domains.entries()].map(([domain, count]) => `${domain}:${count}`).join(", ")}`
  ].join("\n");
}

function renderRecommendText(value: any): string {
  const selected = value.candidates.filter((candidate: any) => !candidate.skipped);
  const lines = [
    value.summary,
    `Decision: ${value.decisionId}`,
    `Safety: ${value.safetyProfile}`,
    "",
    "Selected:"
  ];
  for (const candidate of selected) {
    lines.push(`- ${candidate.name} (${candidate.score}) domains=${candidate.matchedDomains.join(",") || "n/a"}`);
    lines.push(`  ${candidate.reasons.slice(0, 2).join("; ")}`);
  }
  if (value.gaps.length) {
    lines.push("", "Gaps:");
    for (const gap of value.gaps) lines.push(`- ${gap.domain}: ${gap.suggestedSkillNames.join(", ")}`);
  }
  return lines.join("\n");
}

function renderInspectText(card: any): string {
  return [
    `${card.name}`,
    `ID: ${card.id}`,
    `Domains: ${card.domains.join(", ")}`,
    `Risk: ${card.risk}`,
    `Credentials: ${card.requiresCredentials ? "yes" : "no"}`,
    `Description: ${card.description}`
  ].join("\n");
}

function renderEvalText(report: any): string {
  return [
    `Eval suite: ${report.suite}`,
    `Cases: ${report.total}`,
    `Recall: ${report.skillRecall}`,
    `Precision: ${report.skillPrecision}`,
    `False positive rate: ${report.falsePositiveRate}`
  ].join("\n");
}

function renderDoctorText(value: any): string {
  return [
    `SkillOS doctor: ${value.ok ? "ok" : "needs attention"}`,
    `Root: ${value.root}`,
    `Inventory: ${value.inventoryCount}`,
    `Validation warnings: ${value.validationWarnings}`,
    "Clients:",
    ...value.adapters.map((adapter: any) => `- ${adapter.id}: ${adapter.install?.ok ? "installed" : "preset available"}`)
  ].join("\n");
}

function renderPresetsText(value: any): string {
  return [`Preset files written to ${value.outDir}.`, `Files: ${value.written.length}`].join("\n");
}

function renderPresetDiffText(value: any): string {
  return [
    `Preset diff for ${value.clientId}:`,
    ...value.diffs.map((diff: any) => `- ${diff.action}: ${diff.targetPath}`)
  ].join("\n");
}

function renderPresetApplyText(value: any): string {
  return [`Applied ${value.clientId} preset.`, `Files written: ${value.written.length}`].join("\n");
}

function renderExplainText(value: any): string {
  const lines = [
    `Decision: ${value.decisionId}`,
    `Task: ${value.task}`,
    `Summary: ${value.summary}`,
    `Safety: ${value.safetyProfile}`,
    "Top candidates:"
  ];
  for (const candidate of value.topCandidates) {
    lines.push(`- ${candidate.name}: ${candidate.score} ${candidate.skipped ? "(skipped)" : "(selected)"}`);
  }
  return lines.join("\n");
}

function renderFeedbackText(value: any): string {
  return [
    `Feedback recorded for ${value.decisionId}.`,
    `Routing memory preferences: ${value.memory.preferences.length}`
  ].join("\n");
}

function renderPackVerifyText(report: PackVerificationReport): string {
  return [
    `Pack verification: ${report.ok ? "ok" : "failed"}`,
    `Zip: ${report.zipPath}`,
    `Entries: ${report.entries}`,
    `Forbidden matches: ${report.forbiddenMatches.length ? report.forbiddenMatches.join(", ") : "none"}`,
    `Missing required: ${report.missingRequired.length ? report.missingRequired.join(", ") : "none"}`
  ].join("\n");
}

function verifyZipListing(zipPath: string): PackVerificationReport {
  const required = [
    "skillos/README.md",
    "skillos/package.json",
    "skillos/packages/core/package.json",
    "skillos/packages/cli/package.json",
    "skillos/packages/mcp-server/package.json",
    "skillos/packages/adapters/package.json",
    "skillos/presets/openclaw/openclaw-like.manifest.json"
  ];
  if (!existsSync(zipPath)) {
    return {
      ok: false,
      zipPath,
      checkedAt: new Date().toISOString(),
      entries: 0,
      forbiddenMatches: ["zip file missing"],
      requiredMatches: [],
      missingRequired: required
    };
  }
  const result = spawnSync("tar", ["-tf", zipPath], { encoding: "utf8" });
  const entries = result.stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/\\/g, "/"));
  const forbiddenPatterns = [
    /(^|\/)\.skillos(\/|$)/,
    /(^|\/)node_modules(\/|$)/,
    /\.tsbuildinfo$/,
    /decision-log\.jsonl$/,
    /routing-memory\.json$/,
    /(^|\/)config\.json$/,
    /api[_-]?key/i,
    /token/i,
    /E:/
  ];
  const forbiddenMatches = entries.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));
  const requiredMatches = required.filter((entry) => entries.includes(entry));
  const missingRequired = required.filter((entry) => !entries.includes(entry));
  return {
    ok: result.status === 0 && forbiddenMatches.length === 0 && missingRequired.length === 0,
    zipPath,
    checkedAt: new Date().toISOString(),
    entries: entries.length,
    forbiddenMatches,
    requiredMatches,
    missingRequired
  };
}

function printHelp(): void {
  console.log(`SkillOS CLI

Commands:
  skillos init --safety approve|suggest|auto [--root <dir>]
  skillos setup --safety approve --clients codex,claude-code,cursor,windsurf,openhands,openclaw
  skillos inventory [--skills-root <dir>] [--include-system] [--format json|text]
  skillos inventory --no-write
  skillos recommend "<task>" [--phase <phase>] [--safety <profile>] [--root <dir>]
  skillos recommend "<task>" --model-enhancement
  skillos inspect <skill-id-or-name>
  skillos eval run [--suite default]
  skillos doctor [--root <dir>]
  skillos presets [adapter...] [--out <dir>]
  skillos preset diff --client <id> [--root <dir>]
  skillos preset apply --client <id> --confirm [--root <dir>]
  skillos explain --last [--root <dir>]
  skillos feedback --decision <id> [--prefer <skill>] [--avoid <skill>]
  skillos pack verify [--zip dist/skillos.zip]

Use --format json for stable machine-readable output.
`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => {
    process.exitCode = code;
  });
}
