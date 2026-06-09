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
  assert.equal(rootPackage.scripts["verify:publish-readiness"], "node scripts/verify-publish-readiness.mjs");
  assert.equal(rootPackage.scripts["publish:preview:dry-run"], "node scripts/publish-preview.mjs --dry-run");
  assert.equal(rootPackage.scripts["publish:preview:live"], "node scripts/publish-preview.mjs --confirm-live");
  assert.match(rootPackage.scripts["release:local"], /verify:install/);

  const verifier = await readFile(join(repoRoot, "scripts", "verify-installation.mjs"), "utf8");
  assert.match(verifier, /agent-skills-local-install-codex/);
  assert.match(verifier, /real-user-directory-safety/);

  const powershellBootstrap = await readFile(join(repoRoot, "scripts", "install-from-github.ps1"), "utf8");
  assert.match(powershellBootstrap, /SKILLOS_INSTALL_DIR/);

  assert.equal(existsSync(join(repoRoot, "scripts", "verify-publish-readiness.mjs")), true);
  assert.equal(existsSync(join(repoRoot, "scripts", "publish-preview.mjs")), true);
});

test("product positioning and multilingual docs are exposed", async () => {
  const readme = await readFile(join(repoRoot, "README.md"), "utf8");
  assert.match(readme, /mission control for every skill/);
  assert.match(readme, /\[!\[skills\.sh\]\(https:\/\/skills\.sh\/b\/xiaoxiaofeiya\/SkillOS\)\]\(https:\/\/skills\.sh\/xiaoxiaofeiya\/SkillOS\)/);
  assert.match(readme, /docs\/market-context\.md/);
  assert.match(readme, /docs\/publishing-platforms\.md/);
  assert.match(readme, /v0\.1\.0-preview\.1/);
  assert.match(readme, /docs\/i18n\/zh-CN\/README\.md/);
  assert.match(readme, /docs\/i18n\/ja\/README\.md/);
  assert.match(readme, /docs\/i18n\/ko\/README\.md/);
  assert.match(readme, /docs\/i18n\/es\/README\.md/);
  assert.match(readme, /docs\/i18n\/fr\/README\.md/);

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
  for (const path of requiredDocs) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
  }

  const market = await readFile(join(repoRoot, "docs", "market-context.md"), "utf8");
  assert.match(market, /OpenAI Codex plugins and skills/);
  assert.match(market, /Claude Code Skills/);
  assert.match(market, /MCP Client Best Practices/);

  const languages = await readFile(join(repoRoot, "docs", "languages.md"), "utf8");
  assert.match(languages, /简体中文/);
  assert.match(languages, /日本語/);
  assert.match(languages, /한국어/);
  assert.match(languages, /Español/);
  assert.match(languages, /Français/);
});

test("preview publishing metadata is version-aligned", async () => {
  const version = "0.1.0-preview.1";
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

  for (const file of packageFiles) {
    const json = JSON.parse(await readFile(join(repoRoot, file), "utf8"));
    assert.equal(json.version, version, `${file} version should match preview version`);
    for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const [name, dependencyVersion] of Object.entries(json[key] ?? {})) {
        if (name.startsWith("@skillos/")) assert.equal(dependencyVersion, version, `${file} dependency ${name} should match preview version`);
      }
    }
  }

  const claudeMarketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.equal(claudeMarketplace.plugins[0].version, version);
  assert.equal(claudeMarketplace.plugins[0].source, "./");

  const mcpPackage = JSON.parse(await readFile(join(repoRoot, "packages", "mcp-server", "package.json"), "utf8"));
  const server = JSON.parse(await readFile(join(repoRoot, "server.json"), "utf8"));
  assert.equal(mcpPackage.mcpName, "io.github.xiaoxiaofeiya/skillos");
  assert.equal(server.name, mcpPackage.mcpName);
  assert.equal(server.version, version);
  assert.equal(server.packages[0].identifier, "@skillos/mcp-server");
  assert.equal(server.packages[0].transport.type, "stdio");
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
