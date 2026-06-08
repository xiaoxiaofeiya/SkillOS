import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleMcpRequest } from "../packages/mcp-server/dist/index.js";

test("MCP initialize and tool list return stable JSON-RPC", async () => {
  const init = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize" });
  assert.equal(init.result.serverInfo.name, "skillos");
  const list = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.ok(list.result.tools.some((tool) => tool.name === "recommend_skill_chain"));
});

test("MCP recommend_skill_chain uses dynamic skill inventory", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-mcp-skills-"));
  await mkdir(join(root, "playwright"), { recursive: true });
  await writeFile(join(root, "playwright", "SKILL.md"), "---\nname: playwright\ndescription: Browser automation for localhost UI flows.\n---\n", "utf8");
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "recommend_skill_chain",
      arguments: {
        task: "Open this localhost page and test the UI flow in a browser.",
        skillsRoot: root,
        phase: "verification",
        modelEnhancement: true,
        modelEnhancementApiKeyEnv: "MISSING_SKILLOS_TEST_KEY"
      }
    }
  });
  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.enhancement.applied, false);
  assert.ok(payload.data.candidates.some((candidate) => candidate.name === "playwright"));
});

test("MCP client preset and explain tools return stable envelopes", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillos-mcp-client-"));
  const preset = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "render_client_preset",
      arguments: {
        clientId: "codex",
        root
      }
    }
  });
  const payload = JSON.parse(preset.result.content[0].text);
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 1);
  assert.equal(payload.data.plan.clientId, "codex");
  assert.ok(payload.data.diffs.some((diff) => diff.action === "create"));

  const missingExplain = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "explain_decision",
      arguments: { root }
    }
  });
  const explainPayload = JSON.parse(missingExplain.result.content[0].text);
  assert.equal(explainPayload.ok, false);
  assert.equal(explainPayload.error.code, "decision_not_found");
});
