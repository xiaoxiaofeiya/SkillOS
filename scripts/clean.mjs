import { rm } from "node:fs/promises";

for (const path of [
  "packages/core/dist",
  "packages/core/tsconfig.tsbuildinfo",
  "packages/adapters/dist",
  "packages/adapters/tsconfig.tsbuildinfo",
  "packages/mcp-server/dist",
  "packages/mcp-server/tsconfig.tsbuildinfo",
  "packages/cli/dist",
  "packages/cli/tsconfig.tsbuildinfo",
  "dist",
  "dist-presets"
]) {
  await rm(new URL(`../${path}`, import.meta.url), { recursive: true, force: true });
}
