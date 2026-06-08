#!/usr/bin/env node
export * from "./tools.js";
export * from "./server.js";

import { runStdioServer } from "./server.js";
import { fileURLToPath } from "node:url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runStdioServer();
}
