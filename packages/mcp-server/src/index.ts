#!/usr/bin/env node
export * from "./tools.js";
export * from "./server.js";

import { runStdioServer } from "./server.js";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (isDirectEntrypoint(import.meta.url)) {
  runStdioServer();
}

function isDirectEntrypoint(importMetaUrl: string): boolean {
  if (!process.argv[1]) return false;
  try {
    const current = realpathSync(fileURLToPath(importMetaUrl));
    const invoked = realpathSync(process.argv[1]);
    return process.platform === "win32"
      ? current.toLowerCase() === invoked.toLowerCase()
      : current === invoked;
  } catch {
    const current = fileURLToPath(importMetaUrl);
    const invoked = process.argv[1];
    return process.platform === "win32"
      ? current.toLowerCase() === invoked.toLowerCase()
      : current === invoked;
  }
}
