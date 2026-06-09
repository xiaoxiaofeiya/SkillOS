#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0-preview.1";
const MCP_NAME = "io.github.xiaoxiaofeiya/skillos";
const REPO = "xiaoxiaofeiya/SkillOS";
const REPO_URL = `https://github.com/${REPO}`;
const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");
const args = parseArgs(process.argv.slice(2));
const live = Boolean(args.live);
const formatJson = args.format === "json";
const checks = [];

await checkPublicGitHubRepo();
await checkDocsAndReadme();
await checkVersionsAndManifests();
await checkMcpMetadata();
await checkAgentSkill();
await checkTools();
await checkGitRemote();

const summary = countStatuses(checks);
const report = {
  ok: summary.fail === 0,
  version: 1,
  mode: live ? "live" : "readiness",
  checkedAt: new Date().toISOString(),
  repoRoot,
  summary,
  checks
};

if (formatJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(renderText(report));
}
process.exitCode = report.ok ? 0 : 1;

async function checkPublicGitHubRepo() {
  await step("github-public-repo", async () => {
    const response = await fetchJson(`https://api.github.com/repos/${REPO}`);
    assert(response.private === false, "GitHub repository must be public.", response);
    assert(response.visibility === "public", "GitHub repository visibility must be public.", response);
    const topics = Array.isArray(response.topics) ? response.topics : [];
    const requiredTopics = [
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
    const missingTopics = requiredTopics.filter((topic) => !topics.includes(topic));
    if (missingTopics.length) {
      return {
        status: "warning",
        details: { visibility: response.visibility, htmlUrl: response.html_url, topics, missingTopics }
      };
    }
    return { status: "pass", details: { visibility: response.visibility, htmlUrl: response.html_url, topics } };
  });
}

async function checkDocsAndReadme() {
  await step("docs-and-readme", async () => {
    const readme = await readText("README.md");
    const requiredReadme = [
      "[![skills.sh](https://skills.sh/b/xiaoxiaofeiya/SkillOS)](https://skills.sh/xiaoxiaofeiya/SkillOS)",
      "docs/market-context.md",
      "docs/publishing-platforms.md",
      "docs/mcp-distribution.md",
      "v0.1.0-preview.1"
    ];
    const missingReadme = requiredReadme.filter((value) => !readme.includes(value));
    const requiredDocs = [
      "docs/product-overview.md",
      "docs/market-context.md",
      "docs/languages.md",
      "docs/publishing-platforms.md",
      "docs/launch-checklist.md",
      "docs/mcp-distribution.md",
      "docs/community-launch-kit.md",
      "docs/i18n/zh-CN/README.md",
      "docs/i18n/ja/README.md",
      "docs/i18n/ko/README.md",
      "docs/i18n/es/README.md",
      "docs/i18n/fr/README.md"
    ];
    const missingDocs = requiredDocs.filter((file) => !existsSync(join(repoRoot, file)));
    assert(missingReadme.length === 0 && missingDocs.length === 0, "README or publishing docs are incomplete.", { missingReadme, missingDocs });
    return { requiredDocs: requiredDocs.length };
  });
}

async function checkVersionsAndManifests() {
  await step("versions-and-manifests", async () => {
    const packageFiles = [
      "package.json",
      "packages/core/package.json",
      "packages/adapters/package.json",
      "packages/cli/package.json",
      "packages/mcp-server/package.json",
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
      "gemini-extension.json",
      "presets/openclaw/openclaw-plugin.json"
    ];
    const versions = {};
    for (const file of packageFiles) {
      const json = await readJson(file);
      versions[file] = json.version;
      assert(json.version === VERSION, `${file} version must be ${VERSION}.`, { file, version: json.version });
      checkInternalDeps(file, json);
    }
    const lock = await readJson("package-lock.json");
    assert(lock.version === VERSION, "package-lock root version must match preview version.", { version: lock.version });
    assert(lock.packages?.[""]?.version === VERSION, "package-lock workspace root version must match preview version.", { version: lock.packages?.[""]?.version });
    for (const workspace of ["packages/core", "packages/adapters", "packages/cli", "packages/mcp-server"]) {
      assert(lock.packages?.[workspace]?.version === VERSION, `${workspace} lock version must match preview version.`, { version: lock.packages?.[workspace]?.version });
      checkInternalDeps(`package-lock:${workspace}`, lock.packages[workspace]);
    }
    const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
    assert(claudeMarketplace.plugins?.[0]?.version === VERSION, "Claude marketplace plugin version must match preview version.", claudeMarketplace.plugins?.[0]);
    assert(claudeMarketplace.plugins?.[0]?.source === "./", "Claude marketplace source must remain ./.", claudeMarketplace.plugins?.[0]);
    return { versions };
  });
}

async function checkMcpMetadata() {
  await step("mcp-metadata", async () => {
    const server = await readJson("server.json");
    const mcpPackage = await readJson("packages/mcp-server/package.json");
    assert(server.name === MCP_NAME, "server.json name must match MCP registry name.", { name: server.name });
    assert(server.version === VERSION, "server.json version must match preview version.", { version: server.version });
    assert(mcpPackage.mcpName === MCP_NAME, "packages/mcp-server package.json mcpName must match server.json name.", { mcpName: mcpPackage.mcpName });
    const npmPackage = server.packages?.find((pkg) => pkg.registryType === "npm");
    assert(Boolean(npmPackage), "server.json must include an npm package entry.", server);
    assert(npmPackage.identifier === "@skillos/mcp-server", "server.json npm identifier must be @skillos/mcp-server.", npmPackage);
    assert(npmPackage.version === VERSION, "server.json npm package version must match preview version.", npmPackage);
    assert(npmPackage.transport?.type === "stdio", "server.json npm package must declare stdio transport.", npmPackage);
    assert(mcpPackage.bin?.["skillos-mcp-server"] === "dist/index.js", "MCP package must expose skillos-mcp-server bin.", mcpPackage.bin);
    return { name: server.name, npmPackage: npmPackage.identifier };
  });
}

async function checkAgentSkill() {
  await step("agent-skill", async () => {
    const text = await readText("skills/skillos/SKILL.md");
    assert(/^---\r?\nname:\s*skillos\r?\n/m.test(text), "SkillOS SKILL.md must expose name: skillos.");
    assert(text.includes("skillos recommend \"<concrete task>\""), "SkillOS skill must document skillos recommend.");
    assert(text.includes("allowed-tools:"), "SkillOS skill must declare allowed tools.");
    return { skill: "skills/skillos/SKILL.md" };
  });
}

async function checkTools() {
  await step("publish-tools", async () => {
    const tools = [
      { name: "node", command: "node", critical: true },
      { name: "git", command: "git", critical: true },
      { name: "npm", command: process.platform === "win32" ? "npm.cmd" : "npm", critical: true },
      { name: "npx", command: process.platform === "win32" ? "npx.cmd" : "npx", critical: true },
      { name: "gh", command: "gh", critical: false },
      { name: "clawhub", command: "clawhub", critical: false },
      { name: "openclaw", command: "openclaw", critical: false },
      { name: "mcp-publisher", command: "mcp-publisher", critical: false }
    ];
    const results = tools.map((tool) => ({ ...tool, found: commandExists(tool.command) }));
    const missingCritical = results.filter((tool) => tool.critical && !tool.found);
    assert(missingCritical.length === 0, "Missing critical publish readiness tools.", { missingCritical, results });
    const missingOptional = results.filter((tool) => !tool.critical && !tool.found).map((tool) => tool.name);
    return {
      status: missingOptional.length ? "warning" : "pass",
      details: { tools: results, missingOptional }
    };
  });
}

async function checkGitRemote() {
  await step("git-remote", async () => {
    const remote = run("git", ["remote", "get-url", "origin"]);
    const origin = remote.stdout.trim();
    assert(normalizeGitRemote(origin) === normalizeGitRemote(REPO_URL), "origin remote must point at the public SkillOS repo.", { remote: origin });
    return { origin };
  });
}

function normalizeGitRemote(value) {
  return String(value)
    .trim()
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

async function step(name, action) {
  try {
    const result = await action();
    if (result?.status) {
      checks.push({ name, status: result.status, details: result.details ?? {} });
    } else {
      checks.push({ name, status: "pass", details: result ?? {} });
    }
  } catch (err) {
    checks.push({ name, status: "fail", details: errorDetails(err) });
  }
}

function checkInternalDeps(label, json) {
  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    if (!json[key]) continue;
    for (const [name, version] of Object.entries(json[key])) {
      if (name.startsWith("@skillos/")) {
        assert(version === VERSION, `${label} dependency ${name} must be ${VERSION}.`, { dependency: name, version });
      }
    }
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SkillOS-publish-readiness",
        "Accept": "application/vnd.github+json"
      }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

async function readText(file) {
  return await readFile(join(repoRoot, file), "utf8");
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 60000,
    maxBuffer: 1024 * 1024 * 10
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} exited ${result.status}: ${stripAnsi(result.stderr ?? result.stdout ?? "")}`);
  }
  return {
    stdout: stripAnsi(result.stdout ?? ""),
    stderr: stripAnsi(result.stderr ?? ""),
    exitCode: result.status
  };
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const checkerArgs = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(checker, checkerArgs, { stdio: "ignore", shell: process.platform !== "win32" });
  return result.status === 0;
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

function errorDetails(err) {
  return {
    message: err instanceof Error ? err.message : String(err),
    ...(err?.details ?? {})
  };
}

function countStatuses(values) {
  const summary = { pass: 0, fail: 0, warning: 0, skipped: 0 };
  for (const value of values) summary[value.status] = (summary[value.status] ?? 0) + 1;
  return summary;
}

function renderText(report) {
  const lines = [
    `SkillOS publish readiness: ${report.ok ? "ok" : "failed"}`,
    `Mode: ${report.mode}`,
    `Checks: pass=${report.summary.pass} warning=${report.summary.warning} fail=${report.summary.fail} skipped=${report.summary.skipped}`
  ];
  for (const check of report.checks) {
    lines.push(`- ${check.status}: ${check.name}`);
    if (check.status !== "pass" && check.details?.message) lines.push(`  ${check.details.message}`);
    if (check.name === "publish-tools" && check.details?.missingOptional?.length) {
      lines.push(`  optional tools missing: ${check.details.missingOptional.join(", ")}`);
    }
    if (check.name === "github-public-repo" && check.details?.missingTopics?.length) {
      lines.push(`  missing topics: ${check.details.missingTopics.join(", ")}`);
    }
  }
  return lines.join("\n");
}

function stripAnsi(text) {
  return String(text).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
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
