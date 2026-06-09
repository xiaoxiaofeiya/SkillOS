#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0-preview.1";
const TAG = `v${VERSION}`;
const REPO = "xiaoxiaofeiya/SkillOS";
const REPO_URL = `https://github.com/${REPO}.git`;
const TOPICS = [
  "agent-skills",
  "mcp",
  "mcp-server",
  "codex",
  "claude-code",
  "cursor",
  "windsurf",
  "openhands",
  "openclaw",
  "ai-agents",
  "developer-tools"
];
const WORKSPACES = [
  "@skillos/core",
  "@skillos/adapters",
  "@skillos/mcp-server",
  "@skillos/cli"
];
const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");
const args = parseArgs(process.argv.slice(2));
const live = Boolean(args["confirm-live"]);
const dryRun = Boolean(args["dry-run"]) || !live;
const formatJson = args.format === "json";
const results = [];

if (dryRun) {
  await collectDryRunPlan();
} else {
  await runLivePublish();
}

const summary = countStatuses(results);
const report = {
  ok: summary.fail === 0,
  version: 1,
  mode: dryRun ? "dry-run" : "live",
  releaseVersion: VERSION,
  tag: TAG,
  generatedAt: new Date().toISOString(),
  summary,
  results
};

if (formatJson) console.log(JSON.stringify(report, null, 2));
else console.log(renderText(report));
process.exitCode = report.ok ? 0 : 1;

async function collectDryRunPlan() {
  add("local-gates", "planned", {
    commands: [
      "npm.cmd test",
      "npm.cmd run pack:zip",
      "node packages\\cli\\dist\\index.js pack verify --format json",
      "npm.cmd run pack:npm",
      "npm.cmd run verify:install",
      "npm.cmd run verify:install:network",
      "npm.cmd run verify:publish-readiness -- --format json"
    ]
  });
  add("github-release", "planned", {
    commands: [
      `git tag ${TAG}`,
      `git push origin ${TAG}`
    ]
  });
  add("github-topics-and-agent-skills", commandExists("gh") ? "planned" : "skipped", {
    reason: commandExists("gh") ? undefined : "tool_missing",
    commands: [
      `gh repo edit ${REPO} --add-topic ${TOPICS.join(",")}`,
      "gh skill publish --dry-run"
    ]
  });
  add("npm-preview-packages", commandExists(npmBin()) ? "planned" : "skipped", {
    reason: commandExists(npmBin()) ? undefined : "tool_missing",
    commands: WORKSPACES.map((workspace) => `npm.cmd publish --workspace ${workspace} --access public --tag preview`)
  });
  add("mcp-registry", commandExists("mcp-publisher") ? "planned" : "skipped", {
    reason: commandExists("mcp-publisher") ? undefined : "tool_missing",
    commands: ["mcp-publisher publish"]
  });
  add("clawhub", commandExists("clawhub") ? "planned" : "skipped", {
    reason: commandExists("clawhub") ? undefined : "tool_missing",
    commands: [
      `clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version ${VERSION} --dry-run`,
      `clawhub skill publish ./skills/skillos --slug skillos --name "SkillOS" --version ${VERSION}`
    ]
  });
  add("manual-community-submissions", "planned", {
    docs: [
      "docs/community-launch-kit.md",
      "docs/publishing-platforms.md",
      "docs/mcp-distribution.md"
    ]
  });
}

async function runLivePublish() {
  await runGate("npm-test", npmBin(), ["test"], 240000);
  await runGate("pack-zip", npmBin(), ["run", "pack:zip"], 120000);
  await runGate("pack-verify", "node", ["packages/cli/dist/index.js", "pack", "verify", "--format", "json"], 60000);
  await runGate("pack-npm", npmBin(), ["run", "pack:npm"], 120000);
  await runGate("verify-install", npmBin(), ["run", "verify:install"], 900000);
  await runGate("verify-install-network", npmBin(), ["run", "verify:install:network"], 900000);
  await runGate("verify-publish-readiness", npmBin(), ["run", "verify:publish-readiness", "--", "--format", "json", "--live"], 120000);
  if (results.some((item) => item.status === "fail")) return;

  await verifyCleanGitState();
  await publishGitHubReleaseTag();
  await publishGitHubAgentSkill();
  const npmAvailable = await publishNpmPackages();
  await publishMcpRegistry(npmAvailable);
  await publishClawHub();
  add("manual-community-submissions", "skipped", {
    reason: "manual_submission_required",
    docs: ["docs/community-launch-kit.md", "docs/publishing-platforms.md", "docs/mcp-distribution.md"]
  });
}

async function runGate(name, command, commandArgs, timeoutMs) {
  try {
    const result = run(command, commandArgs, { timeoutMs });
    add(name, "pass", commandSummary(result));
  } catch (err) {
    add(name, "fail", errorDetails(err));
  }
}

async function verifyCleanGitState() {
  try {
    const remote = run("git", ["remote", "get-url", "origin"]);
    if (remote.stdout.trim() !== REPO_URL) {
      add("git-remote", "fail", { message: "origin remote does not point at the SkillOS public repo.", origin: remote.stdout.trim() });
      return;
    }
    const status = run("git", ["status", "--porcelain"]);
    if (status.stdout.trim()) {
      add("git-worktree-clean", "fail", { message: "worktree must be clean before live publish.", status: status.stdout.trim() });
      return;
    }
    add("git-worktree-clean", "pass", { origin: remote.stdout.trim() });
  } catch (err) {
    add("git-worktree-clean", "fail", errorDetails(err));
  }
}

async function publishGitHubReleaseTag() {
  if (results.some((item) => item.status === "fail")) return;
  try {
    const localTag = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${TAG}`], { cwd: repoRoot, encoding: "utf8" });
    if (localTag.status !== 0) run("git", ["tag", TAG]);
    const remoteTag = spawnSync("git", ["ls-remote", "--tags", "origin", TAG], { cwd: repoRoot, encoding: "utf8", timeout: 60000 });
    if (remoteTag.status === 0 && remoteTag.stdout.trim()) {
      add("github-release-tag", "skipped", { reason: "already_exists", tag: TAG });
      return;
    }
    const push = run("git", ["push", "origin", TAG], { timeoutMs: 120000 });
    add("github-release-tag", "pass", { tag: TAG, push: commandSummary(push) });
  } catch (err) {
    add("github-release-tag", "fail", errorDetails(err));
  }
}

async function publishGitHubAgentSkill() {
  if (!commandExists("gh")) {
    add("github-agent-skills", "skipped", { reason: "tool_missing", tool: "gh" });
    return;
  }
  try {
    run("gh", ["auth", "status"], { timeoutMs: 60000 });
  } catch (err) {
    add("github-agent-skills", "skipped", { reason: "auth_missing", details: summarizeError(err) });
    return;
  }
  try {
    const topics = run("gh", ["repo", "edit", REPO, "--add-topic", TOPICS.join(",")], { timeoutMs: 120000 });
    const skill = run("gh", ["skill", "publish", "--dry-run"], { timeoutMs: 120000 });
    add("github-agent-skills", "pass", { topics: commandSummary(topics), skillPublishDryRun: commandSummary(skill) });
  } catch (err) {
    add("github-agent-skills", "fail", errorDetails(err));
  }
}

async function publishNpmPackages() {
  if (!commandExists(npmBin())) {
    add("npm-preview-packages", "skipped", { reason: "tool_missing", tool: npmBin() });
    return false;
  }
  try {
    run(npmBin(), ["whoami"], { timeoutMs: 60000 });
  } catch (err) {
    add("npm-preview-packages", "skipped", { reason: "auth_missing", details: summarizeError(err) });
    return false;
  }

  let allAvailable = true;
  for (const workspace of WORKSPACES) {
    const existing = spawnSync(npmBin(), ["view", `${workspace}@${VERSION}`, "version"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60000
    });
    if (existing.status === 0 && existing.stdout.trim() === VERSION) {
      add(`npm:${workspace}`, "skipped", { reason: "already_exists", version: VERSION });
      continue;
    }
    try {
      const publish = run(npmBin(), ["publish", "--workspace", workspace, "--access", "public", "--tag", "preview"], { timeoutMs: 240000 });
      add(`npm:${workspace}`, "pass", commandSummary(publish));
    } catch (err) {
      allAvailable = false;
      const text = JSON.stringify(errorDetails(err)).toLowerCase();
      if (/permission|forbidden|scope|payment|required|not authorized|unauthorized|403|404/.test(text)) {
        add(`npm:${workspace}`, "skipped", { reason: "scope_unavailable", details: summarizeError(err) });
      } else {
        add(`npm:${workspace}`, "fail", errorDetails(err));
      }
    }
  }
  return allAvailable && await npmPackageVersionExists("@skillos/mcp-server", VERSION);
}

async function publishMcpRegistry(npmAvailable) {
  if (!npmAvailable) {
    add("mcp-registry", "skipped", { reason: "npm_package_not_published" });
    return;
  }
  if (!commandExists("mcp-publisher")) {
    add("mcp-registry", "skipped", { reason: "tool_missing", tool: "mcp-publisher" });
    return;
  }
  try {
    const publish = run("mcp-publisher", ["publish"], { timeoutMs: 240000 });
    add("mcp-registry", "pass", commandSummary(publish));
  } catch (err) {
    const text = JSON.stringify(errorDetails(err)).toLowerCase();
    if (/auth|login|credential|unauthorized|forbidden|401|403/.test(text)) {
      add("mcp-registry", "skipped", { reason: "auth_missing", details: summarizeError(err) });
    } else {
      add("mcp-registry", "fail", errorDetails(err));
    }
  }
}

async function publishClawHub() {
  if (!commandExists("clawhub")) {
    add("clawhub", "skipped", { reason: "tool_missing", tool: "clawhub" });
    return;
  }
  try {
    const dry = run("clawhub", ["skill", "publish", "./skills/skillos", "--slug", "skillos", "--name", "SkillOS", "--version", VERSION, "--dry-run"], { timeoutMs: 120000 });
    const livePublish = run("clawhub", ["skill", "publish", "./skills/skillos", "--slug", "skillos", "--name", "SkillOS", "--version", VERSION], { timeoutMs: 240000 });
    add("clawhub", "pass", { dryRun: commandSummary(dry), publish: commandSummary(livePublish) });
  } catch (err) {
    const text = JSON.stringify(errorDetails(err)).toLowerCase();
    if (/auth|login|credential|unauthorized|forbidden|401|403/.test(text)) {
      add("clawhub", "skipped", { reason: "auth_missing", details: summarizeError(err) });
    } else {
      add("clawhub", "fail", errorDetails(err));
    }
  }
}

async function npmPackageVersionExists(packageName, version) {
  const result = spawnSync(npmBin(), ["view", `${packageName}@${version}`, "version"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 60000
  });
  return result.status === 0 && result.stdout.trim() === version;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 120000,
    maxBuffer: 1024 * 1024 * 20
  });
  const payload = {
    command: [command, ...commandArgs].join(" "),
    cwd: options.cwd ?? repoRoot,
    exitCode: result.status,
    signal: result.signal,
    stdout: stripAnsi(result.stdout ?? ""),
    stderr: stripAnsi(result.stderr ?? "")
  };
  if (result.error) {
    const err = new Error(`Command failed to start: ${payload.command}`);
    err.details = payload;
    throw err;
  }
  if (result.status !== 0) {
    const err = new Error(`Command exited ${result.status}: ${payload.command}`);
    err.details = payload;
    throw err;
  }
  return payload;
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const checkerArgs = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(checker, checkerArgs, { stdio: "ignore", shell: process.platform !== "win32" });
  return result.status === 0;
}

function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function add(platform, status, details = {}) {
  results.push({ platform, status, details });
}

function commandSummary(result) {
  return {
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    stdout: summarize(result.stdout),
    stderr: summarize(result.stderr)
  };
}

function errorDetails(err) {
  return {
    message: err instanceof Error ? err.message : String(err),
    ...(err?.details ? commandSummary(err.details) : {})
  };
}

function summarizeError(err) {
  return summarize(JSON.stringify(errorDetails(err)));
}

function summarize(text) {
  const clean = stripAnsi(String(text ?? "")).trim();
  if (clean.length <= 1000) return clean;
  return `${clean.slice(0, 500)}\n...\n${clean.slice(-300)}`;
}

function stripAnsi(text) {
  return String(text).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function countStatuses(values) {
  const summary = { pass: 0, fail: 0, skipped: 0, planned: 0 };
  for (const value of values) summary[value.status] = (summary[value.status] ?? 0) + 1;
  return summary;
}

function renderText(report) {
  const lines = [
    `SkillOS preview publish ${report.mode}: ${report.ok ? "ok" : "failed"}`,
    `Version: ${report.releaseVersion}`,
    `Tag: ${report.tag}`,
    `Results: pass=${report.summary.pass} planned=${report.summary.planned} skipped=${report.summary.skipped} fail=${report.summary.fail}`
  ];
  for (const result of report.results) {
    lines.push(`- ${result.status}: ${result.platform}${result.details?.reason ? ` (${result.details.reason})` : ""}`);
  }
  return lines.join("\n");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) parsed[key] = inlineValue;
    else if (values[index + 1] && !values[index + 1].startsWith("--")) parsed[key] = values[++index];
    else parsed[key] = true;
  }
  return parsed;
}
