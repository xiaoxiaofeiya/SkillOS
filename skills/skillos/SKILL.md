---
name: skillos
description: "Use SkillOS as a local-first orchestration layer to discover installed skills/tools, recommend staged skill chains, render just-in-time skill context, record decisions, accept feedback, and verify client setup. Trigger for vague or non-trivial coding-agent work, UI/design, browser QA, deployment, security, notebooks/data, documents, CLI creation, Windows apps, OpenAI docs, MCP, OpenClaw, client adapters, and any request where the agent should autonomously decide which skills to use."
allowed-tools: Bash, Read, Write
license: MIT
metadata:
  openclaw:
    requires:
      bins:
        - node
        - git
    optionalEnv:
      - OPENAI_API_KEY
    tags:
      - skills
      - orchestration
      - routing
      - mcp
      - codex
      - claude-code
      - cursor
      - windsurf
      - openhands
      - openclaw
---

# SkillOS

SkillOS is the dispatcher for local skills, tools, presets, and workflows. Use it before substantial agent work so the current task is routed to the right local capabilities instead of relying on the user to name a skill.

## Runtime Check

1. Run:

```bash
skillos doctor --format json
```

2. If `skillos` is unavailable, install or update the local runtime from this skill directory:

```bash
node scripts/install-runtime.mjs --safety approve
```

If the command is executed from outside this skill directory, run it with the absolute path to `scripts/install-runtime.mjs` beside this `SKILL.md`.

3. If installation is not appropriate for the current safety mode or user request, explain that the Agent Skill is installed but the local SkillOS runtime is missing. Give the repository installer as the fallback.

## Intake Workflow

For every vague or non-trivial development request:

1. Convert the user's request into a concrete one-sentence task.
2. Inspect the repository only as much as needed to identify framework, files, current phase, and risk.
3. Ask SkillOS for a chain:

```bash
skillos recommend "<concrete task>" --phase intake --format json
```

4. Use the selected skills/tools from the returned chain. Do not blindly load every skill.
5. Record corrections with `skillos feedback` when the user redirects or a recommendation is wrong.

## Phase Audit

Re-run SkillOS routing when the work moves phases:

```bash
skillos recommend "<task>" --phase planning --format json
skillos recommend "<task>" --phase implementation --format json
skillos recommend "<task>" --phase verification --format json
skillos recommend "<task>" --phase security-review --format json
skillos explain --last --format json
```

Use the phase-specific output to add browser checks, screenshots, deployment guidance, security review, threat modeling, document handling, notebook work, OpenAI docs, or OpenClaw adapter support when the local installation has those capabilities.

## Client Setup

When the user asks to configure an agent client, generate plans first:

```bash
skillos setup --safety approve --clients codex,claude-code,cursor,windsurf,openhands,openclaw
skillos preset diff --client codex
```

Only apply real client files after explicit confirmation:

```bash
skillos preset apply --client codex --confirm
```

## MCP Path

If the client exposes SkillOS MCP tools, prefer the MCP tools for structured calls:

- `inventory_skills`
- `recommend_skill_chain`
- `render_skill_context`
- `record_decision`
- `record_feedback`
- `render_client_preset`
- `verify_client_setup`
- `explain_decision`

Keep MCP outputs as structured evidence. Render only the relevant context into the conversation.

## Safety

Respect the configured safety profile:

- `suggest`: recommend only.
- `approve`: show plans before writing files, running commands, networking, deploying, using credentials, or sending data externally.
- `auto`: automate low/medium-risk steps but still block high-risk work.

Never send secrets, full private files, or raw local decision logs to external services. Use `skillos explain --last` and local decision logs for traceability.
