import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../packages/cli/dist/index.js";

test("CLI setup generates presets without applying client config", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-cli-setup-"));
  const { code, stdout } = await captureMain(["setup", "--root", root, "--clients", "codex", "--format", "json"]);
  assert.equal(code, 0);
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.clients[0], "codex");
  assert.equal(existsSync(join(root, ".skillos", "generated-presets", "codex", "AGENTS.md")), true);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
});

test("CLI recommend records an explainable decision", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-cli-recommend-"));
  await captureMain(["init", "--root", root, "--safety", "approve", "--format", "json"]);
  const recommend = await captureMain(["recommend", "Open localhost and test the UI in a browser", "--root", root, "--skills-root", await fakeSkillsRootPath(), "--format", "json"]);
  assert.equal(recommend.code, 0);
  const payload = JSON.parse(recommend.stdout);
  assert.ok(payload.decisionId);
  const explain = await captureMain(["explain", "--last", "--root", root, "--format", "json"]);
  assert.equal(explain.code, 0);
  const explanation = JSON.parse(explain.stdout);
  assert.equal(explanation.decisionId, payload.decisionId);
});

async function captureMain(argv) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (value = "") => logs.push(String(value));
  console.error = (value = "") => errors.push(String(value));
  try {
    const code = await main(argv);
    return { code, stdout: logs.join("\n"), stderr: errors.join("\n") };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

async function fakeSkillsRootPath() {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "skillos-cli-skills-"));
  await mkdir(join(root, "playwright"), { recursive: true });
  await writeFile(join(root, "playwright", "SKILL.md"), "---\nname: playwright\ndescription: Browser automation and UI testing.\n---\n", "utf8");
  return root;
}
