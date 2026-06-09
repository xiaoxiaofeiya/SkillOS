# Product Overview

SkillOS is the control center for coding-agent skills.

It is built for one very practical moment: you ask an agent for help, but you do not know which skill, tool, plugin, MCP server, rule, or workflow should be used. You should not have to know. The agent should be able to look at the job, look at the machine, understand what is installed, and choose a smart path.

That is the product.

## The Big Idea

AI coding agents are becoming more powerful every month. They can write code, edit files, run commands, test a web page, search docs, generate images, deploy apps, threat-model systems, operate notebooks, and call external tools.

But power alone is not enough.

If an agent has fifty skills installed and still waits for you to say the perfect skill name, the system is still too hard. If it loads everything into context, it becomes noisy and expensive. If it deploys, sends data, or touches credentials without a clear safety gate, it becomes dangerous.

SkillOS gives the agent a better way:

```text
Understand the request
  -> inspect installed capabilities
  -> read repo signals
  -> choose a staged skill chain
  -> explain the decision
  -> keep risky steps under the safety profile
  -> learn from feedback
```

## In Plain Language

Think of every skill as a specialist.

One specialist is good at UI. Another is good at browser testing. Another knows deployment. Another reviews security. Another builds CLIs. Another works with notebooks or documents.

SkillOS is the coordinator that asks:

- What is the user really trying to do?
- Which specialists are available on this machine?
- Which ones are useful now?
- Which ones should wait until later?
- Which ones are risky?
- What proof should we collect before saying the job is done?

That is why SkillOS is not just an installer. It is the layer that helps installed skills become useful at the right time.

## Example: A Non-Technical User

User:

```text
I do not know design. Make this page look like a real product.
```

A weak agent might change colors and stop.

SkillOS should push the agent toward a better chain:

```text
Understand the product
  -> plan the layout
  -> implement the interface
  -> open it in a browser
  -> capture screenshots
  -> fix overflow, spacing, and broken states
  -> summarize what changed
```

The user does not need to say "use Playwright" or "run screenshot QA". SkillOS helps the agent infer the workflow.

## Example: A Developer

User:

```text
Deploy this app, but make sure it is safe.
```

SkillOS can route this as more than deployment:

```text
Inspect repo
  -> detect deployment options
  -> check credentials and environment variables
  -> recommend the deploy skill if installed
  -> require approval for risky steps
  -> run smoke checks
  -> explain what happened
```

The useful part is not only "deploy". The useful part is deploying with context, checks, and visible decisions.

## Example: A Power User

User:

```text
I installed new skills. Use whatever makes sense from now on.
```

SkillOS does not need a source-code update for each new skill. It can inventory local skills, derive capability cards, validate the metadata, and let future recommendations change based on what is actually installed.

That means two users can ask the same question and get different skill chains because their machines have different capabilities. That is the point.

## What SkillOS Provides

- **Inventory**: discover installed skills, tools, presets, and client adapter capabilities.
- **Capability cards**: turn messy skill descriptions into structured routing data.
- **Routing**: match plain-language tasks to likely domains and phases.
- **Skill chains**: recommend multi-step workflows instead of one isolated skill.
- **Safety gates**: evaluate write, command, network, deploy, credential, private-data, and destructive actions.
- **Decision logs**: store redacted local traces so decisions can be inspected.
- **Feedback memory**: let users say "prefer this" or "avoid that" and improve future routing.
- **Client adapters**: generate presets for Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like clients.
- **MCP server**: expose stable tools for inventory, search, recommendation, context rendering, feedback, evals, and setup checks.
- **Evals**: measure whether routing is getting better with realistic prompts.

## Why Local-First Matters

SkillOS is meant to run on the user's machine first.

Local-first means:

- Routing works without external model calls.
- Decision logs stay under `.skillos/`.
- Logs are redacted before writing.
- Optional model enhancement is off by default.
- Release packages exclude local config, logs, credentials, `node_modules`, build metadata, and private paths.
- Users can choose `suggest`, `approve`, or `auto` safety profiles.

This matters because agent tools can touch real files, real credentials, and real production systems. A skill orchestration layer should be useful, but it should also be visible and governable.

## What Makes It Different

A normal skill says:

```text
When I am loaded, here is how to do one job.
```

SkillOS asks:

```text
Which job is this?
Which skills exist?
Which skills should be loaded?
Which order should they run in?
What should be skipped?
What is risky?
How do we verify the result?
How do we learn from user correction?
```

That is the difference between a passive skill library and an active skill operating layer.

## Who It Is For

SkillOS is for:

- People who use agents but do not know skill names.
- Developers who install many skills and want the agent to use them at the right time.
- Teams that need one routing layer across multiple agent clients.
- Skill authors who want their work to be discoverable by capability, not only by name.
- OpenClaw and OpenClaw-like runtime builders who need probing, manifests, and adapter support.
- Agent developers who need stable JSON, MCP tools, decision traces, and evals.

## What Success Looks Like

SkillOS is working when:

- Vague prompts produce useful staged plans.
- New skills become discoverable without editing SkillOS code.
- Different machines produce different recommendations based on installed capabilities.
- The agent explains why it selected and skipped skills.
- Risky work is visible and controlled by a safety profile.
- Users can correct routing and see future behavior improve.
- Install paths are verified in isolated temporary environments before distribution.

## What To Read Next

- [Market Context](market-context.md): why this product exists now.
- [Installation](installation.md): install the agent-facing skill and local runtime.
- [Distribution Guide](distribution.md): understand public preview install paths and release packaging.
- [Client Adapters](client-adapters.md): see how SkillOS maps into different coding-agent clients.
- [Capability Card Schema](capability-card-schema.md): understand how installed skills are normalized for routing.
- [Safety Profiles](safety-profiles.md): configure suggest, approve, and auto behavior.
- [Routing Evals](evals.md): evaluate whether routing decisions are improving.
