import { rm } from "node:fs/promises";

for (const path of [
  "packages/core/dist",
  "packages/adapters/dist",
  "packages/mcp-server/dist",
  "packages/cli/dist",
  "dist",
  "dist-presets"
]) {
  await rm(new URL(`../${path}`, import.meta.url), { recursive: true, force: true });
}
