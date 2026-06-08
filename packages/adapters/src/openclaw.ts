import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  inventorySkills,
  type ClientInstallPlan,
  type InstalledSkill,
  type OpenClawLikeAdapter,
  type PresetDiff,
  type SkillChain,
  type SkillOSConfig
} from "@skillos/core";
import { diffPlanTargets } from "./base.js";

export interface OpenClawLikeManifest {
  name: string;
  variant?: string;
  roots?: {
    skills?: string;
    plugins?: string;
    hooks?: string;
    mcp?: string;
  };
  capabilities?: string[];
}

export function createOpenClawAdapter(): OpenClawLikeAdapter {
  return {
    id: "openclaw",
    displayName: "OpenClaw",
    async detectCapabilities(root = process.cwd()) {
      const manifest = await readManifest(root);
      return {
        client: "openclaw",
        manifest: manifest ?? null,
        supportsNativePlugins: true,
        supportsNativeSkills: true,
        supportsHooks: true,
        supportsMcp: true,
        supportsAcp: true,
        supportsGateway: true,
        probed: await probeOpenClawLike(root)
      };
    },
    async listNativeSkills(root = process.cwd()) {
      const manifest = await readManifest(root);
      const skillRoot = manifest?.roots?.skills ? join(root, manifest.roots.skills) : join(root, "skills");
      return inventorySkills({ skillsRoot: skillRoot, includeSystem: true }).catch(() => [] as InstalledSkill[]);
    },
    async listPlugins(root = process.cwd()) {
      const manifest = await readManifest(root);
      return listJsonLike(root, manifest?.roots?.plugins ?? "plugins");
    },
    async listHooks(root = process.cwd()) {
      const manifest = await readManifest(root);
      return listJsonLike(root, manifest?.roots?.hooks ?? "hooks");
    },
    async listMcpServers(root = process.cwd()) {
      const manifest = await readManifest(root);
      return listJsonLike(root, manifest?.roots?.mcp ?? "mcp");
    },
    async renderPreset(config: SkillOSConfig) {
      return this.installOrRenderPreset(config);
    },
    async renderInstallPlan(root: string, config: SkillOSConfig): Promise<ClientInstallPlan> {
      const preset = await this.renderPreset(config);
      return {
        clientId: "openclaw",
        displayName: "OpenClaw",
        root,
        safetyProfile: config.safetyProfile,
        targets: Object.entries(preset).map(([relativePath, content]) => ({
          clientId: "openclaw",
          relativePath,
          targetPath: join(root, relativePath),
          content,
          description: relativePath.includes("manifest") || relativePath.includes("plugin")
            ? "OpenClaw native plugin or OpenClaw-like manifest"
            : "OpenClaw MCP or SkillOS configuration",
          risk: "medium"
        })),
        notes: [
          "OpenClaw is treated as a first-class runtime.",
          "OpenClaw-like variants can declare roots and capabilities through openclaw-like.manifest.json; otherwise SkillOS probes conventional directories."
        ]
      };
    },
    async diffExistingConfig(root: string, plan: ClientInstallPlan): Promise<PresetDiff[]> {
      return diffPlanTargets(root, plan);
    },
    async verifyInstall(root = process.cwd()) {
      const capabilities = await this.detectCapabilities(root);
      const expected = ["openclaw-plugin.json", "openclaw-like.manifest.json", "skillos.mcp.json"];
      const files = expected.map((file) => ({
        relativePath: file,
        exists: existsSync(join(root, file))
      }));
      return {
        client: "openclaw",
        ok: files.every((file) => file.exists),
        capabilities,
        files
      };
    },
    async installOrRenderPreset(config: SkillOSConfig) {
      return {
        "openclaw-plugin.json": JSON.stringify(renderOpenClawPluginManifest(), null, 2),
        "openclaw-like.manifest.json": JSON.stringify(renderOpenClawLikeManifest(), null, 2),
        "skillos.mcp.json": JSON.stringify({
          mcpServers: {
            skillos: {
              command: "skillos-mcp-server",
              args: ["--client", "openclaw"]
            }
          }
        }, null, 2),
        "skillos.config.example.json": JSON.stringify(config, null, 2)
      };
    },
    renderInvocationHints(chain: SkillChain) {
      return [
        "OpenClaw: invoke SkillOS before native plugin, skill, MCP, ACP, or Gateway workflow selection.",
        `Map SkillOS chain ${chain.id} to OpenClaw workflow phases: ${chain.steps.map((step) => step.phase).join(", ")}.`
      ];
    },
    mapSkillOSChainToClientWorkflow(chain: SkillChain) {
      return {
        kind: "openclaw.workflow",
        version: 1,
        id: chain.id,
        safetyProfile: chain.safetyProfile,
        steps: chain.steps.map((step) => ({
          phase: step.phase,
          title: step.title,
          skillIds: step.skillIds,
          requiresApproval: step.requiresApproval,
          risk: step.risk
        }))
      };
    }
  };
}

export async function readManifest(root: string): Promise<OpenClawLikeManifest | null> {
  const manifestPath = join(root, "openclaw-like.manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as OpenClawLikeManifest;
  } catch {
    return null;
  }
}

async function probeOpenClawLike(root: string): Promise<Record<string, boolean>> {
  return {
    hasManifest: existsSync(join(root, "openclaw-like.manifest.json")),
    hasPluginManifest: existsSync(join(root, "openclaw-plugin.json")) || existsSync(join(root, "plugin.json")),
    hasSkillsDir: existsSync(join(root, "skills")),
    hasPluginsDir: existsSync(join(root, "plugins")),
    hasHooksDir: existsSync(join(root, "hooks")),
    hasMcpDir: existsSync(join(root, "mcp")),
    hasAcpDir: existsSync(join(root, "acp")),
    hasGatewayDir: existsSync(join(root, "gateway"))
  };
}

async function listJsonLike(root: string, relativeDir: string): Promise<Array<Record<string, unknown>>> {
  const dir = join(root, relativeDir);
  if (!existsSync(dir)) return [];
  const records: Array<Record<string, unknown>> = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const path = join(dir, entry.name);
    try {
      records.push({ path, ...JSON.parse(await readFile(path, "utf8")) });
    } catch {
      records.push({ path, unreadable: true });
    }
  }
  return records;
}

function renderOpenClawPluginManifest(): Record<string, unknown> {
  return {
    name: "skillos",
    displayName: "SkillOS",
    version: "0.1.0",
    description: "Progressive skill discovery and orchestration for OpenClaw and OpenClaw-like clients.",
    capabilities: ["skills", "plugins", "hooks", "mcp", "acp", "gateway"],
    mcp: {
      command: "skillos-mcp-server",
      args: ["--client", "openclaw"]
    }
  };
}

function renderOpenClawLikeManifest(): OpenClawLikeManifest {
  return {
    name: "openclaw-like",
    variant: "generic",
    roots: {
      skills: "skills",
      plugins: "plugins",
      hooks: "hooks",
      mcp: "mcp"
    },
    capabilities: ["native-skills", "native-plugins", "hooks", "mcp", "acp", "gateway"]
  };
}
