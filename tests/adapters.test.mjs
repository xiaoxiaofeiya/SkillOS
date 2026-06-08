import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAllAdapters, createOpenClawAdapter } from "../packages/adapters/dist/index.js";
import { defaultConfig } from "../packages/core/dist/index.js";

test("all adapters render presets", async () => {
  const config = defaultConfig("approve");
  for (const adapter of createAllAdapters()) {
    const files = await adapter.renderPreset(config);
    assert.ok(Object.keys(files).length > 0, adapter.id);
    const root = await mkdtemp(join(tmpdir(), `skillos-${adapter.id}-plan-`));
    const plan = await adapter.renderInstallPlan(root, config);
    const diffs = await adapter.diffExistingConfig(root, plan);
    assert.ok(plan.targets.length > 0, adapter.id);
    assert.ok(diffs.every((diff) => diff.action === "create"), adapter.id);
  }
});

test("OpenClaw-like manifest and probing are supported", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-openclaw-"));
  await writeFile(join(root, "openclaw-like.manifest.json"), JSON.stringify({
    name: "test-openclaw-like",
    roots: { skills: "skills", plugins: "plugins", hooks: "hooks", mcp: "mcp" },
    capabilities: ["native-skills", "mcp", "acp"]
  }), "utf8");
  await mkdir(join(root, "plugins"), { recursive: true });
  await writeFile(join(root, "plugins", "demo.json"), JSON.stringify({ name: "demo" }), "utf8");

  const adapter = createOpenClawAdapter();
  const capabilities = await adapter.detectCapabilities(root);
  assert.equal(capabilities.supportsAcp, true);
  assert.equal(capabilities.probed.hasManifest, true);
  const plugins = await adapter.listPlugins(root);
  assert.equal(plugins[0].name, "demo");
  const plan = await adapter.renderInstallPlan(root, defaultConfig("approve"));
  assert.ok(plan.targets.some((target) => target.relativePath === "openclaw-like.manifest.json"));
});
