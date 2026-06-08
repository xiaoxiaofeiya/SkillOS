import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deriveCapabilityCards,
  inventorySkills,
  recommendSkillChain,
  runRoutingEval,
  defaultEvalCases,
  recommendSkillChainEnhanced,
  initSkillOSConfig,
  readSkillOSConfig,
  recordUserFeedback,
  summarizeSkillDescriptions,
  reviewRoutingFailure,
  evaluateSafetyGate,
  readRoutingMemory,
  validateCapabilityCards,
  redact
} from "../packages/core/dist/index.js";

test("default eval suite contains at least 300 realistic routing prompts", () => {
  assert.ok(defaultEvalCases.length >= 300);
  const domains = new Set(defaultEvalCases.flatMap((testCase) => testCase.expectedDomains));
  for (const domain of ["ui", "deployment", "security", "data", "document", "cli", "windows-app", "github", "openai", "mcp", "openclaw"]) {
    assert.ok(domains.has(domain), domain);
  }
});

test("inventory discovers newly installed skills without code changes", async () => {
  const root = await fakeSkillsRoot([
    ["playwright", "Use when automating a browser with Playwright for clicks, forms, screenshots, and localhost UI debugging."],
    ["vercel-deploy", "Deploy applications and websites to Vercel."]
  ]);
  const skills = await inventorySkills({ skillsRoot: root });
  assert.deepEqual(skills.map((skill) => skill.name), ["playwright", "vercel-deploy"]);
});

test("routing recommends a staged UI verification chain", async () => {
  const root = await fakeSkillsRoot([
    ["gpt-image-2-ui", "Generate UI mockups and visual design references."],
    ["playwright", "Use when automating a real browser from the terminal."],
    ["screenshot", "Use when capturing screenshots for visual QA."]
  ]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const chain = recommendSkillChain({
    task: "Make this UI professional and verify it in a browser with screenshots.",
    cards,
    phase: "implementation",
    safetyProfile: "approve"
  });
  assert.ok(chain.candidates.some((candidate) => candidate.name === "playwright" && !candidate.skipped));
  assert.ok(chain.steps.some((step) => step.phase === "verification"));
});

test("routing detects skill gaps", async () => {
  const root = await fakeSkillsRoot([["playwright", "Browser automation."]]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const chain = recommendSkillChain({ task: "Analyze this PDF contract.", cards });
  assert.ok(chain.gaps.some((gap) => gap.domain === "document"));
});

test("eval report returns stable metrics", async () => {
  const root = await fakeSkillsRoot([
    ["playwright", "Browser automation and UI testing."],
    ["gpt-image-2-ui", "Generate UI design mockups and visual references."],
    ["security-threat-model", "Threat modeling for auth, upload, API, privacy, and abuse paths."],
    ["vercel-deploy", "Deploy apps to Vercel."],
    ["jupyter-notebook", "Analyze data, CSV, logs, charts, and experiments."],
    ["pdf", "Read PDF documents, manuals, contracts, and extract requirements."],
    ["cli-creator", "Create CLI command-line tools."],
    ["winui-app", "Build WinUI Windows app desktop XAML projects."],
    ["gh-fix-ci", "Fix GitHub Actions CI and pull request failures."],
    ["openai-docs", "Use OpenAI official docs for models, Codex, APIs, and agents."],
    ["openclaw-adapter", "Support OpenClaw plugins, ACP, Gateway, and MCP adapters."]
  ]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const report = runRoutingEval("default", defaultEvalCases, cards);
  assert.equal(report.total, defaultEvalCases.length);
  assert.ok(report.skillRecall >= 0.85);
  assert.ok(report.skillPrecision >= 0.7);
  assert.ok(report.falsePositiveRate <= 0.3);
});

test("optional model enhancement safely falls back when API key is missing", async () => {
  const root = await fakeSkillsRoot([["playwright", "Browser automation and UI testing."]]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const chain = await recommendSkillChainEnhanced({
    task: "Open localhost and verify the UI in a browser.",
    cards,
    modelEnhancement: {
      enabled: true,
      provider: "openai-compatible",
      apiKeyEnv: "MISSING_SKILLOS_TEST_KEY",
      embeddingModel: "text-embedding-3-small"
    },
    env: {}
  });
  assert.equal(chain.enhancement.enabled, true);
  assert.equal(chain.enhancement.applied, false);
  assert.match(chain.enhancement.reason, /missing API key/);
  assert.ok(chain.candidates.some((candidate) => candidate.name === "playwright"));
});

test("optional LLM summaries and failure review fall back locally without credentials", async () => {
  const root = await fakeSkillsRoot([["playwright", "Browser automation and UI testing."]]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const summary = await summarizeSkillDescriptions({
    cards,
    modelEnhancement: {
      enabled: true,
      enableSummaries: true,
      apiKeyEnv: "MISSING_SKILLOS_TEST_KEY",
      llmModel: "test-model"
    },
    env: {}
  });
  assert.equal(summary.applied, false);
  assert.equal(summary.summaries.length, 1);

  const chain = recommendSkillChain({ task: "Open localhost in browser.", cards });
  const review = await reviewRoutingFailure({
    task: "Open localhost in browser.",
    correction: "prefer playwright",
    chain,
    modelEnhancement: {
      enabled: true,
      enableFailureReview: true,
      apiKeyEnv: "MISSING_SKILLOS_TEST_KEY",
      llmModel: "test-model"
    },
    env: {}
  });
  assert.equal(review.applied, false);
  assert.ok(review.suggestions.length >= 1);
});

test("init creates local data files and config deep merge keeps new defaults", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-config-"));
  await initSkillOSConfig(root, "approve");
  assert.equal(existsSync(join(root, ".skillos", "config.json")), true);
  assert.equal(existsSync(join(root, ".skillos", "capabilities.json")), true);
  assert.equal(existsSync(join(root, ".skillos", "decision-log.jsonl")), true);
  assert.equal(existsSync(join(root, ".skillos", "routing-memory.json")), true);

  await writeFile(join(root, ".skillos", "config.json"), JSON.stringify({
    version: 1,
    safetyProfile: "suggest",
    telemetry: false,
    modelEnhancement: { enabled: false },
    clients: {}
  }), "utf8");
  const config = await readSkillOSConfig(root);
  assert.equal(config.safetyProfile, "suggest");
  assert.equal(config.modelEnhancement.apiKeyEnv, "OPENAI_API_KEY");
  assert.equal(config.clients.openclaw.enabled, true);
});

test("feedback updates routing memory locally", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-feedback-"));
  await initSkillOSConfig(root, "approve");
  const memory = await recordUserFeedback(root, "decision-1", "prefer playwright avoid vercel-deploy for local UI checks");
  assert.equal(memory.preferences.length, 1);
  assert.deepEqual(memory.preferences[0].prefer, ["playwright"]);
  assert.deepEqual(memory.preferences[0].avoid, ["vercel-deploy"]);
  const reread = await readRoutingMemory(root);
  assert.equal(reread.preferences.length, 1);
});

test("safety gate enforces suggest approve and auto profiles", () => {
  assert.equal(evaluateSafetyGate({ profile: "suggest", action: "write-file" }).decision, "blocked");
  assert.equal(evaluateSafetyGate({ profile: "approve", action: "run-command" }).decision, "approval-required");
  assert.equal(evaluateSafetyGate({ profile: "approve", action: "read-local", risk: "low" }).decision, "allow");
  assert.equal(evaluateSafetyGate({ profile: "auto", action: "deploy" }).decision, "blocked");
  assert.equal(evaluateSafetyGate({ profile: "auto", action: "write-file" }).decision, "allow");
});

test("routing handles Chinese casual prompts and negation", async () => {
  const root = await fakeSkillsRoot([
    ["gpt-image-2-ui", "Generate UI design mockups and visual references."],
    ["playwright", "Browser automation and UI testing."],
    ["screenshot", "Capture screenshots for visual QA."],
    ["vercel-deploy", "Deploy apps to Vercel."]
  ]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const uiChain = recommendSkillChain({
    task: "我不会设计界面，帮我把这个页面做得专业一点并截图检查。",
    cards,
    phase: "implementation"
  });
  const selected = new Set(uiChain.candidates.filter((candidate) => !candidate.skipped).flatMap((candidate) => candidate.matchedDomains));
  assert.ok(selected.has("ui"));
  assert.ok(selected.has("design"));
  assert.ok(selected.has("screenshot"));

  const noDeploy = recommendSkillChain({
    task: "不要部署，只总结目录结构。",
    cards,
    phase: "planning"
  });
  assert.equal(noDeploy.candidates.some((candidate) => candidate.name === "vercel-deploy" && !candidate.skipped), false);
});

test("capability validation and redaction expose product safety checks", async () => {
  const root = await fakeSkillsRoot([["empty-description", ""]]);
  const cards = deriveCapabilityCards(await inventorySkills({ skillsRoot: root }));
  const validation = validateCapabilityCards(cards);
  assert.equal(validation.length, 1);
  assert.equal(validation[0].ok, true);
  assert.ok(validation[0].issues.some((issue) => issue.field === "description"));
  assert.equal(redact("api_key=sk-test-secret-value token:abc123456789012345678901234"), "api_key=<redacted> token:<redacted>");
});

async function fakeSkillsRoot(items) {
  const root = await mkdtemp(join(tmpdir(), "skillos-skills-"));
  for (const [name, description] of items) {
    const dir = join(root, name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`, "utf8");
  }
  return root;
}
