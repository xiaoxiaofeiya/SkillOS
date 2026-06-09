#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");

class CommandFailure extends Error {
  constructor(message, result) {
    super(message);
    this.result = result;
  }
}

class VerificationFailure extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

const args = parseArgs(process.argv.slice(2));
const includeNetwork = Boolean(args.network);
const networkOnly = Boolean(args["network-only"]);
const skipAgentSkills = Boolean(args["skip-agent-skills"]);
const keepTemp = Boolean(args["keep-temp"]);
const tempRoot = await mkdtemp(join(tmpdir(), "skillos-install-verify-"));
const steps = [];
const realBefore = await snapshotRealTargets();

try {
  if (!networkOnly) {
    if (!skipAgentSkills) {
      await verifyAgentSkillsLocalList();
      await verifyAgentSkillsLocalInstall();
    } else {
      steps.push({ name: "agent-skills-local-list", status: "skipped", details: { reason: "skip_agent_skills_requested" } });
      steps.push({ name: "agent-skills-local-install-codex", status: "skipped", details: { reason: "skip_agent_skills_requested" } });
    }
    await verifyRuntimeSourceInstall();
    await verifyRuntimeLinkedInstall();
    await verifyZipInstall();
    await verifyClaudeMarketplaceStatic();
  }
  if (includeNetwork) {
    await verifyAgentSkillsRemoteList();
    await verifyAgentSkillsRemoteInstall();
    await verifyGitHubBootstrap();
  }
} finally {
  const realAfter = await snapshotRealTargets();
  const changes = compareSnapshots(realBefore, realAfter);
  steps.push({
    name: "real-user-directory-safety",
    status: changes.length === 0 ? "pass" : "fail",
    details: { changedTargets: changes }
  });
  if (!keepTemp) await rm(tempRoot, { recursive: true, force: true });
}

const counts = countStatuses(steps);
const report = {
  ok: counts.fail === 0,
  version: 1,
  mode: includeNetwork ? "network" : "local",
  startedAt: new Date().toISOString(),
  repoRoot,
  tempRoot,
  keptTemp: keepTemp,
  summary: counts,
  steps
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;

async function verifyAgentSkillsLocalList() {
  await step("agent-skills-local-list", async () => {
    const env = isolatedEnv("agent-list");
    const result = run(npxBin(), ["--yes", "skills", "add", ".", "-l", "-a", "codex", "--full-depth"], {
      cwd: repoRoot,
      env,
      timeoutMs: 120000
    });
    assert(result.stdout.includes("skillos"), "Local Agent Skills listing did not include skillos.", { result });
    return { command: result.command, exitCode: result.exitCode, stdout: summarize(result.stdout), stderr: summarize(result.stderr) };
  }, { network: true, ciOptional: true });
}

async function verifyAgentSkillsLocalInstall() {
  await step("agent-skills-local-install-codex", async () => {
    const env = isolatedEnv("agent-install-local");
    const result = run(npxBin(), ["--yes", "skills", "add", ".", "-g", "-y", "-a", "codex", "--skill", "skillos", "--copy"], {
      cwd: repoRoot,
      env,
      timeoutMs: 180000
    });
    const installed = await findInstalledSkill(env.__SKILLOS_VERIFY_ROOT);
    assert(installed.length > 0, "Local Agent Skills install did not create a skillos SKILL.md under the isolated user root.", { result });
    return {
      command: result.command,
      exitCode: result.exitCode,
      installed,
      stdout: summarize(result.stdout),
      stderr: summarize(result.stderr)
    };
  }, { network: true, ciOptional: true });
}

async function verifyRuntimeSourceInstall() {
  await step("runtime-source-install", async () => {
    const env = isolatedEnv("runtime-source");
    const runtimeRoot = join(env.__SKILLOS_VERIFY_ROOT, "repo-copy");
    await copyRepo(runtimeRoot);
    const install = run("node", ["scripts/install-local.mjs", "--no-link"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 240000
    });
    const doctor = run("node", ["packages/cli/dist/index.js", "doctor", "--format", "json"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 60000
    });
    assertJsonOk(doctor.stdout, "doctor");
    const recommend = run("node", ["packages/cli/dist/index.js", "recommend", "Open localhost and verify the UI", "--root", runtimeRoot, "--format", "json"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 60000
    });
    const recommendation = assertJson(recommend.stdout, "recommend");
    assert(Boolean(recommendation.decisionId), "recommend did not return a decisionId.", { recommend });
    const explain = run("node", ["packages/cli/dist/index.js", "explain", "--last", "--root", runtimeRoot, "--format", "json"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 60000
    });
    assertJson(explain.stdout, "explain");
    const setupRoot = join(env.__SKILLOS_VERIFY_ROOT, "setup-root");
    const setup = run("node", ["packages/cli/dist/index.js", "setup", "--root", setupRoot, "--format", "json"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 60000
    });
    assertJsonOk(setup.stdout, "setup");
    return {
      install: commandSummary(install),
      doctor: commandSummary(doctor),
      recommend: commandSummary(recommend),
      explain: commandSummary(explain),
      setup: commandSummary(setup)
    };
  });
}

async function verifyRuntimeLinkedInstall() {
  await step("runtime-linked-install", async () => {
    const env = isolatedEnv("runtime-link");
    const runtimeRoot = join(env.__SKILLOS_VERIFY_ROOT, "repo-copy");
    await copyRepo(runtimeRoot);
    const install = run("node", ["scripts/install-local.mjs", "--skip-setup"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 240000
    });
    const skillosPath = commandShimPath(env.__SKILLOS_NPM_PREFIX, "skillos");
    const mcpPath = commandShimPath(env.__SKILLOS_NPM_PREFIX, "skillos-mcp-server");
    assert(existsSync(skillosPath), `Missing linked skillos command at ${skillosPath}.`, { install });
    assert(existsSync(mcpPath), `Missing linked skillos-mcp-server command at ${mcpPath}.`, { install });
    const doctorRoot = join(env.__SKILLOS_VERIFY_ROOT, "doctor-root");
    await mkdir(doctorRoot, { recursive: true });
    const doctor = run(skillosPath, ["doctor", "--root", doctorRoot, "--format", "json"], {
      cwd: runtimeRoot,
      env,
      timeoutMs: 60000
    });
    assertJsonOk(doctor.stdout, "linked doctor");
    return {
      install: commandSummary(install),
      linkedCommands: [skillosPath, mcpPath],
      doctor: commandSummary(doctor)
    };
  });
}

async function verifyZipInstall() {
  await step("zip-install", async () => {
    const env = isolatedEnv("zip-install");
    const pack = run(npmBin(), ["run", "pack:zip"], { cwd: repoRoot, env, timeoutMs: 120000 });
    const zipPath = join(repoRoot, "dist", "skillos.zip");
    assert(existsSync(zipPath), "dist/skillos.zip was not created.", { pack });
    const entries = listZip(zipPath);
    const required = [
      "skillos/skills/skillos/SKILL.md",
      "skillos/.claude-plugin/marketplace.json",
      "skillos/.codex-plugin/plugin.json",
      "skillos/.agents/plugins/marketplace.json",
      "skillos/server.json",
      "skillos/docs/publishing-platforms.md",
      "skillos/docs/launch-checklist.md",
      "skillos/docs/mcp-distribution.md",
      "skillos/docs/community-launch-kit.md"
    ];
    const forbidden = [
      /(^|\/)\.skillos(\/|$)/,
      /(^|\/)node_modules(\/|$)/,
      /\.tsbuildinfo$/,
      /\.log$/,
      /token/i,
      /api[_-]?key/i,
      /^[A-Za-z]:\//
    ];
    const missing = required.filter((item) => !entries.includes(item));
    const forbiddenMatches = entries.filter((entry) => forbidden.some((pattern) => pattern.test(entry)));
    assert(missing.length === 0, "Zip package is missing required distribution entries.", { missing });
    assert(forbiddenMatches.length === 0, "Zip package includes forbidden/private entries.", { forbiddenMatches });

    const extractRoot = join(env.__SKILLOS_VERIFY_ROOT, "extract");
    await mkdir(extractRoot, { recursive: true });
    extractZip(zipPath, extractRoot);
    const bundleRoot = join(extractRoot, "skillos");
    const install = run(npmBin(), ["ci"], { cwd: bundleRoot, env, timeoutMs: 240000 });
    const build = run(npmBin(), ["run", "build"], { cwd: bundleRoot, env, timeoutMs: 120000 });
    const setupRoot = join(env.__SKILLOS_VERIFY_ROOT, "zip-setup-root");
    const setup = run("node", ["packages/cli/dist/index.js", "setup", "--root", setupRoot, "--format", "json"], {
      cwd: bundleRoot,
      env,
      timeoutMs: 60000
    });
    assertJsonOk(setup.stdout, "zip setup");
    return {
      pack: commandSummary(pack),
      entries: entries.length,
      install: commandSummary(install),
      build: commandSummary(build),
      setup: commandSummary(setup)
    };
  });
}

async function verifyClaudeMarketplaceStatic() {
  await step("claude-marketplace-static", async () => {
    const marketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"));
    const plugin = JSON.parse(await readFile(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"));
    assert(marketplace.name === "skillos", "Claude marketplace name must be skillos.", { marketplace });
    assert(marketplace.plugins?.[0]?.name === "skillos", "Claude marketplace plugin name must be skillos.", { marketplace });
    assert(marketplace.plugins?.[0]?.source === "./", "Claude marketplace plugin source must be ./.", { marketplace });
    assert(Boolean(marketplace.plugins?.[0]?.version), "Claude marketplace plugin version is missing.", { marketplace });
    assert(Boolean(marketplace.plugins?.[0]?.homepage), "Claude marketplace plugin homepage is missing.", { marketplace });
    assert(plugin.name === marketplace.plugins[0].name, "Claude plugin.json name must match marketplace plugin name.", { plugin, marketplace });
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");
    assert(readme.includes("/plugin marketplace add xiaoxiaofeiya/SkillOS"), "README is missing the Claude marketplace add command.");
    assert(readme.includes("/plugin install skillos"), "README is missing the Claude plugin install command.");
    return {
      marketplaceName: marketplace.name,
      pluginName: plugin.name,
      version: marketplace.plugins[0].version
    };
  });
}

async function verifyAgentSkillsRemoteList() {
  await step("agent-skills-remote-list", async () => {
    const env = isolatedEnv("agent-remote-list");
    const result = run(npxBin(), ["--yes", "skills", "add", "xiaoxiaofeiya/SkillOS", "-l", "-a", "codex", "--full-depth"], {
      cwd: repoRoot,
      env,
      timeoutMs: 240000
    });
    assert(result.stdout.includes("skillos"), "Remote Agent Skills listing did not include skillos.", { result });
    return commandSummary(result);
  }, { network: true });
}

async function verifyAgentSkillsRemoteInstall() {
  await step("agent-skills-remote-install-codex", async () => {
    const env = isolatedEnv("agent-remote-install");
    const result = run(npxBin(), ["--yes", "skills", "add", "xiaoxiaofeiya/SkillOS", "-g", "-y", "-a", "codex", "--skill", "skillos", "--copy"], {
      cwd: repoRoot,
      env,
      timeoutMs: 300000
    });
    const installed = await findInstalledSkill(env.__SKILLOS_VERIFY_ROOT);
    assert(installed.length > 0, "Remote Agent Skills install did not create a skillos SKILL.md under the isolated user root.", { result });
    return { ...commandSummary(result), installed };
  }, { network: true });
}

async function verifyGitHubBootstrap() {
  await step("github-bootstrap", async () => {
    const env = isolatedEnv("github-bootstrap");
    const installDir = join(env.__SKILLOS_VERIFY_ROOT, "runtime");
    let bootstrap;
    if (process.platform === "win32") {
      bootstrap = run("powershell", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(repoRoot, "scripts", "install-from-github.ps1"),
        "-InstallDir",
        installDir,
        "-NoLink",
        "-SkipSetup"
      ], { cwd: repoRoot, env: { ...env, SKILLOS_INSTALL_DIR: installDir }, timeoutMs: 360000 });
    } else {
      bootstrap = run("bash", [
        join(repoRoot, "scripts", "install-from-github.sh"),
        "--dir",
        installDir,
        "--no-link",
        "--skip-setup"
      ], { cwd: repoRoot, env: { ...env, SKILLOS_INSTALL_DIR: installDir }, timeoutMs: 360000 });
    }
    assert(existsSync(join(installDir, "package.json")), "GitHub bootstrap did not create a runnable SkillOS checkout.", {
      installDir,
      missing: join(installDir, "package.json"),
      bootstrap
    });
    const doctor = run("node", ["packages/cli/dist/index.js", "doctor", "--format", "json"], {
      cwd: installDir,
      env,
      timeoutMs: 60000
    });
    assertJsonOk(doctor.stdout, "bootstrap doctor");
    return { bootstrap: commandSummary(bootstrap), doctor: commandSummary(doctor) };
  }, { network: true });
}

async function step(name, action, options = {}) {
  try {
    const details = await action();
    steps.push({ name, status: "pass", details });
  } catch (err) {
    const details = errorDetails(err);
    const status = options.network && isNetworkFailure(details)
      ? "network_failed"
      : options.ciOptional && isGitHubActions() && isAgentSkillsEnvironmentFailure(details)
        ? "skipped"
        : "fail";
    steps.push({ name, status, details });
  }
}

function isolatedEnv(label) {
  const root = join(tempRoot, label);
  const home = join(root, "home");
  const appData = join(home, "AppData", "Roaming");
  const localAppData = join(home, "AppData", "Local");
  const npmPrefix = join(root, "npm-prefix");
  const npmCache = join(root, "npm-cache");
  const pathPrefix = process.platform === "win32" ? npmPrefix : join(npmPrefix, "bin");
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: appData,
    LOCALAPPDATA: localAppData,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_DATA_HOME: join(home, ".local", "share"),
    CODEX_HOME: join(home, ".codex"),
    AGENTS_HOME: join(home, ".agents"),
    NPM_CONFIG_PREFIX: npmPrefix,
    npm_config_prefix: npmPrefix,
    NPM_CONFIG_CACHE: npmCache,
    npm_config_cache: npmCache,
    NO_COLOR: "1",
    CI: "1",
    PATH: `${pathPrefix}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`,
    Path: `${pathPrefix}${process.platform === "win32" ? ";" : ":"}${process.env.Path ?? process.env.PATH ?? ""}`,
    __SKILLOS_VERIFY_ROOT: root,
    __SKILLOS_NPM_PREFIX: npmPrefix
  };
  if (process.platform === "win32") {
    const match = home.match(/^([A-Za-z]:)(.*)$/);
    if (match) {
      env.HOMEDRIVE = match[1];
      env.HOMEPATH = match[2] || "\\";
    }
  }
  return env;
}

async function findInstalledSkill(root) {
  const results = [];
  await collectSkillFiles(root, results);
  const matches = [];
  for (const file of results) {
    const text = await readFile(file, "utf8").catch(() => "");
    if (/^name:\s*skillos/m.test(text) && text.includes("skillos recommend")) {
      matches.push(file);
    }
  }
  return matches;
}

async function collectSkillFiles(dir, results, depth = 0) {
  if (depth > 8 || !existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectSkillFiles(full, results, depth + 1);
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      results.push(full);
    }
  }
}

async function copyRepo(destination) {
  await cp(repoRoot, destination, {
    recursive: true,
    filter(sourcePath) {
      const rel = relative(repoRoot, sourcePath).replace(/\\/g, "/");
      return !isExcludedFromRepoCopy(rel);
    }
  });
}

function isExcludedFromRepoCopy(rel) {
  return [
    /(^|\/)\.git(\/|$)/,
    /(^|\/)node_modules(\/|$)/,
    /(^|\/)\.skillos(\/|$)/,
    /^dist(\/|$)/,
    /^dist-presets(\/|$)/,
    /\.tsbuildinfo$/,
    /\.tgz$/,
    /\.log$/
  ].some((pattern) => pattern.test(rel));
}

function run(command, commandArgs, options = {}) {
  const invocation = windowsInvocation(command, commandArgs);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    timeout: options.timeoutMs ?? 120000,
    shell: false,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments ?? false
  });
  const payload = {
    command: formatCommand(command, commandArgs),
    cwd: options.cwd ?? repoRoot,
    exitCode: result.status,
    signal: result.signal,
    stdout: stripAnsi(result.stdout ?? ""),
    stderr: stripAnsi(result.stderr ?? "")
  };
  if (result.error) {
    throw new CommandFailure(`Command failed to start: ${payload.command}`, payload);
  }
  if (result.status !== 0) {
    throw new CommandFailure(`Command exited with ${result.status}: ${payload.command}`, payload);
  }
  return payload;
}

function windowsInvocation(command, commandArgs) {
  if (process.platform !== "win32") return { command, args: commandArgs };
  if (!/\.cmd$/i.test(command)) return { command, args: commandArgs };
  const line = ["call", command, ...commandArgs].map(quoteForCmd).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", line],
    windowsVerbatimArguments: true
  };
}

function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxBin() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function commandShimPath(prefix, command) {
  if (process.platform === "win32") return join(prefix, `${command}.cmd`);
  return join(prefix, "bin", command);
}

function listZip(zipPath) {
  const command = process.platform === "win32" ? "tar" : commandExists("unzip") ? "unzip" : "tar";
  const args = command === "unzip" ? ["-Z1", zipPath] : ["-tf", zipPath];
  const result = run(command, args, { cwd: repoRoot, timeoutMs: 60000 });
  return result.stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/\\/g, "/"));
}

function extractZip(zipPath, destination) {
  if (process.platform === "win32") {
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`
    ], { cwd: repoRoot, timeoutMs: 120000 });
    return;
  }
  if (commandExists("unzip")) {
    run("unzip", ["-q", zipPath, "-d", destination], { cwd: repoRoot, timeoutMs: 120000 });
    return;
  }
  run("tar", ["-xf", zipPath, "-C", destination], { cwd: repoRoot, timeoutMs: 120000 });
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const checkerArgs = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(checker, checkerArgs, { stdio: "ignore", shell: process.platform !== "win32" });
  return result.status === 0;
}

function assertJsonOk(text, label) {
  const value = assertJson(text, label);
  assert(value.ok === true, `${label} did not return ok: true.`, { value });
  return value;
}

function assertJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new VerificationFailure(`${label} did not return valid JSON.`, { text: summarize(text) });
  }
}

function assert(condition, message, details = {}) {
  if (!condition) throw new VerificationFailure(message, details);
}

async function snapshotRealTargets() {
  const realHome = process.env.USERPROFILE || process.env.HOME || homedir();
  const npmPrefix = getRealNpmPrefix();
  const paths = [
    join(realHome, ".codex", "skills", "skillos"),
    process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "skills", "skillos") : "",
    join(realHome, ".agents", "skills", "skillos"),
    join(realHome, ".claude", "skills", "skillos"),
    npmPrefix ? commandShimPath(npmPrefix, "skillos") : "",
    npmPrefix ? commandShimPath(npmPrefix, "skillos-mcp-server") : ""
  ].filter(Boolean);
  const snapshot = {};
  for (const path of [...new Set(paths)]) snapshot[path] = await pathFingerprint(path);
  return snapshot;
}

function getRealNpmPrefix() {
  const result = spawnSync(npmBin(), ["config", "get", "prefix"], { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

async function pathFingerprint(path) {
  if (!existsSync(path)) return null;
  const info = await stat(path);
  if (!info.isDirectory()) {
    return `${info.size}:${Math.trunc(info.mtimeMs)}`;
  }
  const files = [];
  await collectFingerprints(path, path, files);
  files.sort();
  return files.join("|");
}

async function collectFingerprints(root, dir, files, depth = 0) {
  if (depth > 8) return;
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).replace(/\\/g, "/");
    const info = await stat(full).catch(() => null);
    if (!info) continue;
    if (entry.isDirectory()) {
      files.push(`${rel}/`);
      await collectFingerprints(root, full, files, depth + 1);
    } else if (entry.isFile()) {
      files.push(`${rel}:${info.size}:${Math.trunc(info.mtimeMs)}`);
    }
  }
}

function compareSnapshots(before, after) {
  const changes = [];
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[path] !== after[path]) changes.push({ path, before: before[path], after: after[path] });
  }
  return changes;
}

function isNetworkFailure(details) {
  const text = JSON.stringify(details).toLowerCase();
  return /(failed to clone|could not resolve|connection|network|timeout|timed out|recv failure|connection was reset|early eof|schannel|unable to access|could not connect|econnreset|enotfound|fetch failed|tls|ssl|proxy)/i.test(text);
}

function isGitHubActions() {
  return process.env.GITHUB_ACTIONS === "true";
}

function isAgentSkillsEnvironmentFailure(details) {
  const text = JSON.stringify(details).toLowerCase();
  return /(agent|codex|skills).*(not detected|not found|not installed|unsupported|unavailable|cannot find)|no supported agent|could not detect|failed to detect|unknown agent/.test(text);
}

function errorDetails(err) {
  if (err instanceof CommandFailure) {
    return {
      message: err.message,
      command: err.result.command,
      cwd: err.result.cwd,
      exitCode: err.result.exitCode,
      signal: err.result.signal,
      stdout: summarize(err.result.stdout),
      stderr: summarize(err.result.stderr)
    };
  }
  if (err instanceof VerificationFailure) {
    return { message: err.message, ...sanitizeDetails(err.details) };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

function sanitizeDetails(value) {
  if (!value || typeof value !== "object") return value;
  if ("result" in value) return { ...value, result: commandSummary(value.result) };
  return value;
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

function summarize(text) {
  const clean = stripAnsi(String(text ?? "")).trim();
  if (clean.length <= 1600) return clean;
  return `${clean.slice(0, 800)}\n...\n${clean.slice(-600)}`;
}

function stripAnsi(text) {
  return String(text).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function formatCommand(command, args) {
  return [command, ...args].map(quoteForDisplay).join(" ");
}

function quoteForDisplay(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@,+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function quoteForCmd(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@,+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function countStatuses(values) {
  const counts = { pass: 0, fail: 0, network_failed: 0, skipped: 0 };
  for (const value of values) counts[value.status] = (counts[value.status] ?? 0) + 1;
  return counts;
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
