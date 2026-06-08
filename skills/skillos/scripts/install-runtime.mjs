#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const repo = "https://github.com/xiaoxiaofeiya/SkillOS.git";
const args = parseArgs(process.argv.slice(2));
const installDir = String(args.dir ?? process.env.SKILLOS_RUNTIME_DIR ?? defaultInstallDir());
const safety = String(args.safety ?? "approve");
const clients = String(args.clients ?? "codex,claude-code,cursor,windsurf,openhands,openclaw");
const noLink = Boolean(args["no-link"]);
const skipSetup = Boolean(args["skip-setup"]);

if (!["suggest", "approve", "auto"].includes(safety)) {
  fail(`Invalid --safety value: ${safety}. Use suggest, approve, or auto.`);
}

if (!commandExists("git")) {
  fail("Git is required to install the SkillOS runtime from GitHub.");
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  fail(`SkillOS requires Node.js >= 20. Current Node.js is ${process.version}.`);
}

await mkdir(parentDir(installDir), { recursive: true });

if (!existsSync(installDir)) {
  run("git", ["clone", repo, installDir]);
} else if (existsSync(join(installDir, ".git"))) {
  run("git", ["-C", installDir, "pull", "--ff-only"]);
} else {
  fail(`Install directory exists but is not a git repository: ${installDir}`);
}

const installArgs = ["scripts/install-local.mjs", "--safety", safety, "--clients", clients];
if (noLink) installArgs.push("--no-link");
if (skipSetup) installArgs.push("--skip-setup");
run("node", installArgs, { cwd: installDir });

console.log("");
console.log("SkillOS runtime is ready.");
console.log("Try:");
console.log("  skillos doctor");
console.log('  skillos recommend "Make this UI professional and verify it"');

function defaultInstallDir() {
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "SkillOS");
  }
  return join(homedir(), ".local", "share", "skillos");
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const checkerArgs = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(checker, checkerArgs, { stdio: "ignore", shell: process.platform !== "win32" });
  return result.status === 0;
}

function run(command, commandArgs, options = {}) {
  const invocation = windowsCmdInvocation(command, commandArgs);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
}

function windowsCmdInvocation(command, commandArgs) {
  if (process.platform !== "win32") return { command, args: commandArgs };
  const lower = command.toLowerCase();
  if (!lower.endsWith(".cmd") && lower !== "npm" && lower !== "npx") return { command, args: commandArgs };
  const cmd = lower.endsWith(".cmd") ? command : `${command}.cmd`;
  const line = [cmd, ...commandArgs].map(quoteForCmd).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", line]
  };
}

function quoteForCmd(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function parentDir(path) {
  return path.replace(/[\\/][^\\/]+$/, "") || ".";
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      result[key] = inlineValue;
    } else if (values[index + 1] && !values[index + 1].startsWith("--")) {
      result[key] = values[++index];
    } else {
      result[key] = true;
    }
  }
  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
