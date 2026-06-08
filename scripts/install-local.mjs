#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const safety = args.safety ?? "approve";
const clients = args.clients ?? "codex,claude-code,cursor,windsurf,openhands,openclaw";
const link = !args["no-link"];
const setup = !args["skip-setup"];

if (!["suggest", "approve", "auto"].includes(safety)) {
  fail(`Invalid --safety value: ${safety}. Use suggest, approve, or auto.`);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  fail(`SkillOS requires Node.js >= 20. Current Node.js is ${process.version}.`);
}

console.log("SkillOS local installer");
console.log(`Repo: ${repoRoot}`);
console.log(`Safety: ${safety}`);
console.log(`Clients: ${clients}`);
console.log("");

run(npm, ["install"]);
run(npm, ["run", "build"]);

if (link) {
  run(npm, ["link"]);
  const skillosCommand = process.platform === "win32" ? "skillos.cmd" : "skillos";
  const mcpCommand = process.platform === "win32" ? "skillos-mcp-server.cmd" : "skillos-mcp-server";
  console.log("");
  console.log("Global commands linked:");
  console.log(`  ${skillosCommand}`);
  console.log(`  ${mcpCommand}`);
  if (process.platform === "win32") {
    console.log("Use the .cmd command names in PowerShell if script execution policy blocks npm .ps1 shims.");
  }
} else {
  console.log("Skipped global command linking because --no-link was provided.");
}

if (setup) {
  run("node", ["packages/cli/dist/index.js", "setup", "--safety", safety, "--clients", clients], { cwd: repoRoot });
} else {
  console.log("Skipped SkillOS setup because --skip-setup was provided.");
}

console.log("");
console.log("Next commands:");
if (link) {
  const skillosCommand = process.platform === "win32" ? "skillos.cmd" : "skillos";
  console.log(`  ${skillosCommand} doctor`);
  console.log(`  ${skillosCommand} recommend "Make this UI professional and verify it"`);
  console.log(`  ${skillosCommand} preset diff --client codex`);
} else {
  console.log("  node packages/cli/dist/index.js doctor");
  console.log("  node packages/cli/dist/index.js recommend \"Make this UI professional and verify it\"");
  console.log("  node packages/cli/dist/index.js preset diff --client codex");
}

function run(command, commandArgs, options = {}) {
  const invocation = windowsCmdInvocation(command, commandArgs);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    shell: false,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments ?? false
  });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
}

function windowsCmdInvocation(command, commandArgs) {
  if (process.platform !== "win32" || !command.endsWith(".cmd")) {
    return { command, args: commandArgs };
  }
  const line = ["call", command, ...commandArgs].map(quoteForCmd).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", line],
    windowsVerbatimArguments: true
  };
}

function quoteForCmd(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
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
