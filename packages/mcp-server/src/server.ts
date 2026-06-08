import readline from "node:readline";
import { callTool, toolDefinitions } from "./tools.js";

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

export async function handleMcpRequest(request: JsonRpcRequest): Promise<Record<string, unknown> | null> {
  if (request.method === "notifications/initialized") return null;

  try {
    if (request.method === "initialize") {
      return ok(request.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "skillos", version: "0.1.0" }
      });
    }
    if (request.method === "tools/list") {
      return ok(request.id, { tools: toolDefinitions });
    }
    if (request.method === "tools/call") {
      const name = String(request.params?.name ?? "");
      const args = request.params?.arguments ?? {};
      const result = await callTool(name, args);
      return ok(request.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      });
    }
    return error(request.id, -32601, `Unknown method: ${request.method}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(request.id, -32000, message);
  }
}

export function runStdioServer(): void {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    void (async () => {
      if (!line.trim()) return;
      const request = JSON.parse(line) as JsonRpcRequest;
      const response = await handleMcpRequest(request);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    })().catch((err) => {
      process.stdout.write(`${JSON.stringify(error(null, -32000, err instanceof Error ? err.message : String(err)))}\n`);
    });
  });
}

function ok(id: JsonRpcRequest["id"], result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function error(id: JsonRpcRequest["id"], code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
