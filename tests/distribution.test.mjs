import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("repository exposes an Agent Skills compatible SkillOS entry", async () => {
  const skillPath = join(repoRoot, "skills", "skillos", "SKILL.md");
  assert.equal(existsSync(skillPath), true);
  const text = await readFile(skillPath, "utf8");
  assert.match(text, /^---\nname: skillos\n/m);
  assert.match(text, /description: "Use SkillOS as a local-first orchestration layer/);
  assert.match(text, /skillos recommend "<concrete task>"/);
  assert.equal(existsSync(join(repoRoot, "skills", "skillos", "scripts", "install-runtime.mjs")), true);
});

test("repository exposes plugin marketplace manifests for distribution", async () => {
  const codexPlugin = JSON.parse(await readFile(join(repoRoot, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(codexPlugin.name, "skillos");
  assert.equal(codexPlugin.skills, "./skills/");
  assert.equal(codexPlugin.interface.displayName, "SkillOS");

  const agentsMarketplace = JSON.parse(await readFile(join(repoRoot, ".agents", "plugins", "marketplace.json"), "utf8"));
  assert.equal(agentsMarketplace.plugins[0].name, "skillos");
  assert.deepEqual(agentsMarketplace.plugins[0].source, { source: "local", path: "./" });
  assert.equal(agentsMarketplace.plugins[0].policy.installation, "AVAILABLE");

  const claudePlugin = JSON.parse(await readFile(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"));
  const claudeMarketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.equal(claudePlugin.name, "skillos");
  assert.equal(claudeMarketplace.plugins[0].source, "./");
});

test("Gemini and OpenClaw distribution metadata avoid bundled secrets", async () => {
  const gemini = JSON.parse(await readFile(join(repoRoot, "gemini-extension.json"), "utf8"));
  assert.equal(gemini.name, "skillos");
  assert.ok(gemini.settings.every((setting) => !("value" in setting)));

  const clawhubIgnore = await readFile(join(repoRoot, ".clawhubignore"), "utf8");
  for (const pattern of [".skillos/", "node_modules/", ".env", "*.log"]) {
    assert.match(clawhubIgnore, new RegExp(escapeRegExp(pattern)));
  }
});

test("installation verification scripts are exposed", async () => {
  const rootPackage = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  assert.equal(rootPackage.scripts["verify:install"], "node scripts/verify-installation.mjs");
  assert.equal(rootPackage.scripts["verify:install:network"], "node scripts/verify-installation.mjs --network --network-only");
  assert.match(rootPackage.scripts["release:local"], /verify:install/);

  const verifier = await readFile(join(repoRoot, "scripts", "verify-installation.mjs"), "utf8");
  assert.match(verifier, /agent-skills-local-install-codex/);
  assert.match(verifier, /real-user-directory-safety/);

  const powershellBootstrap = await readFile(join(repoRoot, "scripts", "install-from-github.ps1"), "utf8");
  assert.match(powershellBootstrap, /SKILLOS_INSTALL_DIR/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
