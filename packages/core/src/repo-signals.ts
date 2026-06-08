import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { RepoSignals } from "./types.js";

const MAX_FILES = 500;
const MAX_DEPTH = 4;
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", "out"]);

export async function detectRepoSignals(root: string = process.cwd()): Promise<RepoSignals> {
  const files = existsSync(root) ? await walk(root, root, 0, []) : [];
  const basenames = new Set(files.map((file) => file.split(/[\\/]/).pop() ?? file));
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();
  const languages = new Set<string>();
  const deployTargets = new Set<string>();

  if (basenames.has("package.json")) {
    languages.add("typescript/javascript");
    const pkgPath = files.find((file) => file.endsWith("package.json"));
    const pkg = pkgPath ? await readJson(join(root, pkgPath)) : null;
    const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
    if ("next" in deps) frameworks.add("next");
    if ("react" in deps) frameworks.add("react");
    if ("vite" in deps) frameworks.add("vite");
    if ("vue" in deps) frameworks.add("vue");
    if ("svelte" in deps) frameworks.add("svelte");
    if ("express" in deps || "fastify" in deps || "hono" in deps) frameworks.add("node-server");
    if ("@modelcontextprotocol/sdk" in deps) frameworks.add("mcp");
  }
  if (basenames.has("package-lock.json")) packageManagers.add("npm");
  if (basenames.has("pnpm-lock.yaml")) packageManagers.add("pnpm");
  if (basenames.has("yarn.lock")) packageManagers.add("yarn");
  if (basenames.has("bun.lockb") || basenames.has("bun.lock")) packageManagers.add("bun");
  if (basenames.has("render.yaml")) deployTargets.add("render");
  if (basenames.has("vercel.json") || basenames.has("next.config.js") || basenames.has("next.config.ts")) deployTargets.add("vercel");
  if (basenames.has("netlify.toml")) deployTargets.add("netlify");
  if (basenames.has("wrangler.toml")) deployTargets.add("cloudflare");
  if (files.some((file) => file.endsWith(".csproj"))) languages.add("csharp");
  if (files.some((file) => file.endsWith(".sln"))) frameworks.add("dotnet");
  if (basenames.has("pyproject.toml") || basenames.has("requirements.txt")) languages.add("python");
  if (files.some((file) => file.endsWith(".ipynb"))) frameworks.add("jupyter");
  if (files.some((file) => /\.(pdf|docx|xlsx|pptx)$/i.test(file))) frameworks.add("documents");
  if (files.some((file) => /\.(csv|tsv|parquet|jsonl)$/i.test(file))) frameworks.add("data");
  if (basenames.has("openclaw-like.manifest.json") || basenames.has("openclaw-plugin.json")) frameworks.add("openclaw");
  if (files.some((file) => /(^|[\\/])(mcp|tools)[\\/]/i.test(file))) frameworks.add("mcp");
  if (files.some((file) => /(^|[\\/])(auth|security|sessions?|uploads?)[\\/]/i.test(file))) frameworks.add("security-sensitive");

  return {
    root,
    files,
    frameworks: [...frameworks],
    packageManagers: [...packageManagers],
    languages: [...languages],
    deployTargets: [...deployTargets]
  };
}

async function walk(root: string, dir: string, depth: number, acc: string[]): Promise<string[]> {
  if (depth > MAX_DEPTH || acc.length >= MAX_FILES) return acc;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (acc.length >= MAX_FILES) break;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walk(root, join(dir, entry.name), depth + 1, acc);
      continue;
    }
    if (entry.isFile()) acc.push(relative(root, join(dir, entry.name)));
  }
  return acc;
}

async function readJson(path: string): Promise<any | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}
