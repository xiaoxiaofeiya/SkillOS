import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { getDefaultSkillsRoot } from "./paths.js";
import type { InstalledSkill, SkillSource } from "./types.js";

export interface InventoryOptions {
  skillsRoot?: string;
  includeSystem?: boolean;
}

export async function inventorySkills(options: InventoryOptions = {}): Promise<InstalledSkill[]> {
  const root = options.skillsRoot ?? getDefaultSkillsRoot();
  if (!existsSync(root)) return [];

  const candidates: Array<{ path: string; source: SkillSource }> = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".system") {
      if (!options.includeSystem) continue;
      const systemRoot = join(root, entry.name);
      for (const child of await readdir(systemRoot, { withFileTypes: true })) {
        if (child.isDirectory()) candidates.push({ path: join(systemRoot, child.name), source: "system" });
      }
      continue;
    }
    candidates.push({ path: join(root, entry.name), source: "user" });
  }

  const skills: InstalledSkill[] = [];
  for (const candidate of candidates.sort((a, b) => a.path.localeCompare(b.path))) {
    const skillMd = join(candidate.path, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    try {
      const text = await readFile(skillMd, "utf8");
      const parsed = parseFrontmatter(text);
      const folderName = candidate.path.split(/[\\/]/).pop() ?? "unknown";
      const name = safeIdentifier(String(parsed.frontmatter.name ?? folderName), folderName);
      const description = String(parsed.frontmatter.description ?? "").trim();
      skills.push({
        id: `${candidate.source}:${name}`,
        name,
        path: candidate.path,
        source: candidate.source,
        description,
        frontmatter: parsed.frontmatter
      });
    } catch {
      const folderName = candidate.path.split(/[\\/]/).pop() ?? "unknown";
      skills.push({
        id: `${candidate.source}:${folderName}`,
        name: folderName,
        path: candidate.path,
        source: candidate.source,
        description: "",
        frontmatter: { unreadable: true }
      });
    }
  }
  return skills;
}

function safeIdentifier(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[^\w:.-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}
