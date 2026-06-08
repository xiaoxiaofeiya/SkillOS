import { mkdir, rm, cp, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");
const dist = join(repoRoot, "dist");
const bundle = join(dist, "skillos");
await rm(dist, { recursive: true, force: true });
await mkdir(bundle, { recursive: true });

const includeRoots = [
  "packages",
  "presets",
  "docs",
  "scripts",
  "tests",
  "package.json",
  "package-lock.json",
  "tsconfig.base.json",
  "README.md",
  "LICENSE"
];

const excluded = [
  /(^|[\\/])node_modules([\\/]|$)/,
  /(^|[\\/])\.skillos([\\/]|$)/,
  /^dist([\\/]|$)/,
  /^dist-presets([\\/]|$)/,
  /\.tsbuildinfo$/,
  /decision-log\.jsonl$/,
  /routing-memory\.json$/,
  /(^|[\\/])config\.json$/,
  /api[_-]?key/i,
  /token/i
];

for (const path of includeRoots) {
  const source = join(repoRoot, path);
  if (!existsSync(source)) continue;
  await cp(source, join(bundle, path), {
    recursive: true,
    filter: (sourcePath) => !isExcluded(relative(repoRoot, sourcePath))
  });
}

await writeFile(join(bundle, "INSTALL.txt"), [
  "SkillOS public preview distribution",
  "",
  "Install dependencies:",
  "  npm install",
  "",
  "Build:",
  "  npm run build",
  "",
  "Initialize:",
  "  npx skillos init --safety approve",
  "",
  "Generate client presets:",
  "  npx skillos setup --safety approve",
  "",
  "Verify package:",
  "  npx skillos pack verify",
  ""
].join("\n"), "utf8");

const manifest = await buildManifest(bundle);
await writeFile(join(bundle, "PACK_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const zipPath = join(dist, "skillos.zip");
const zipResult = process.platform === "win32"
  ? spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -LiteralPath '${bundle.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`
    ], { stdio: "inherit" })
  : spawnSync("zip", ["-qr", zipPath, "skillos"], { cwd: dist, stdio: "inherit" });
if (zipResult.status !== 0) process.exit(zipResult.status ?? 1);

const verification = {
  zipPath,
  createdAt: new Date().toISOString(),
  manifestEntries: manifest.files.length,
  sha256: await sha256File(zipPath),
  containsPrivateSkillOS: manifest.files.some((file) => file.path.includes(".skillos")),
  containsNodeModules: manifest.files.some((file) => file.path.includes("node_modules")),
  containsTsBuildInfo: manifest.files.some((file) => file.path.endsWith(".tsbuildinfo"))
};
await writeFile(join(dist, "pack-verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(zipPath);

function isExcluded(path) {
  const normalized = path.replace(/\\/g, "/");
  return excluded.some((pattern) => pattern.test(normalized));
}

async function buildManifest(root) {
  const files = [];
  await collect(root, root, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    files
  };
}

async function collect(root, dir, files) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(root, fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const info = await stat(fullPath);
    files.push({
      path: relative(root, fullPath).replace(/\\/g, "/"),
      bytes: info.size
    });
  }
}

async function sha256File(path) {
  const { readFile } = await import("node:fs/promises");
  return createHash("sha256").update(await readFile(path)).digest("hex");
}
