import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function getCodexHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.CODEX_HOME ? resolve(env.CODEX_HOME) : join(homedir(), ".codex");
}

export function getDefaultSkillsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(getCodexHome(env), "skills");
}

export function getSkillOSDir(cwd: string = process.cwd()): string {
  return join(cwd, ".skillos");
}
