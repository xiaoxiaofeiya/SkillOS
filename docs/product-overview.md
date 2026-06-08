# Product Overview

SkillOS is a local-first orchestration layer for coding-agent skills, tools, plugins, rules, MCP servers, and client workflows.

It exists because installing capabilities is not enough. In real projects, users often describe work casually or incompletely. They might say "make this UI better", "check if this is safe", "deploy it", "turn this into a tool", or "use whatever skills are useful". A normal skill list still expects the user or agent to remember which capability exists, when it applies, how risky it is, and what should happen after it runs.

SkillOS turns that passive list into a local routing and workflow layer.

## The Problem

Coding agents are gaining many specialized extensions:

- Skills for UI work, browser testing, deployment, security, notebooks, documents, CLI creation, platform docs, and more.
- MCP servers that expose tools and external systems.
- Rules, hooks, workflows, subagents, and plugins in different clients.
- Client-specific configuration formats across Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and similar runtimes.

Without a shared orchestration layer, several things go wrong:

- Users have to know skill names before the agent can use them well.
- Agents may ignore installed skills during implementation or verification.
- Broad prompts can trigger too many tools or the wrong tools.
- A skill may be useful only in a later phase, but the agent only checks once at intake.
- Different users have different installed skills, so hardcoded prompt rules age quickly.
- There is often no clear record of why a tool was selected or skipped.
- Installing a skill does not automatically explain how it should be combined with other capabilities.

SkillOS addresses these problems locally.

## The Product Idea

SkillOS acts like a skill operating layer for coding agents.

It provides:

- **Inventory**: discover installed local skills, generated presets, built-in tools, and client adapter capabilities.
- **Capability cards**: normalize each capability into domains, triggers, inputs, outputs, side effects, credential requirements, risk, verification strength, and client compatibility.
- **Routing**: score candidates using task wording, Chinese and English casual prompts, repo signals, phase, safety profile, routing memory, and negative context.
- **Skill chains**: recommend staged workflows instead of one isolated skill.
- **Safety gates**: evaluate write-file, run-command, external-network, deploy, credential, private-data-send, and destructive actions against a configured safety profile.
- **Decision traces**: record local redacted decisions so users can inspect what happened.
- **Feedback memory**: let users correct "prefer this skill" or "avoid that skill" and feed that into future scoring.
- **Client presets**: map one SkillOS workflow into Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, and OpenClaw-like environments.
- **Evals**: measure routing quality with realistic prompts instead of guessing whether the product feels smart.

## Example Workflows

### UI Work

User prompt:

```text
I do not know UI design. Make this dashboard look professional and check it.
```

SkillOS can recommend a chain like:

```text
UI/design planning
  -> implementation guidance
  -> browser verification
  -> screenshot QA
  -> final review
```

If the user has UI mockup, Playwright, screenshot, or design-related skills installed, SkillOS can route toward them. If not, it can report the gap and suggest what to install.

### Security-Sensitive Work

User prompt:

```text
This upload endpoint uses auth and stores files. Is it safe?
```

SkillOS should identify security and threat-model signals, treat credential and external-data paths as higher risk, and keep recommendations explainable. In `approve` mode, risky follow-up actions should require confirmation or remain a plan.

### Deployment Work

User prompt:

```text
Put this online and make sure it still works.
```

SkillOS can inspect repo signals, detect whether deployment skills are installed, recommend a deployment path only when relevant, and pair it with verification and safety checks.

### Tooling Work

User prompt:

```text
I keep repeating this terminal workflow. Turn it into a reusable command.
```

SkillOS can route to CLI creation, help define command contracts, recommend smoke tests from outside the source folder, and preserve a future skill workflow for agents.

### New Skill Installed

User action:

```text
I installed a new skill.
```

SkillOS should not need source-code changes. The next inventory pass can discover the new skill, derive or validate its capability card, and let routing adapt to the user's actual local environment.

## Why Local-First Matters

SkillOS is designed to run without uploading private project data by default.

Local-first means:

- Inventory and routing work without external model calls.
- Decision logs live under `.skillos/`.
- Logs are redacted before writing.
- Optional model enhancement is off by default.
- Users can choose `suggest`, `approve`, or `auto` safety modes.
- Release bundles exclude `.skillos/`, logs, credentials, `node_modules`, TypeScript build-info files, and local path metadata.

Optional model enhancement can be enabled later, but it is not required for the core product.

## How SkillOS Differs From A Normal Skill

A normal skill usually describes one workflow and waits for an agent to load it.

SkillOS is different because it focuses on orchestration:

- It discovers many capabilities.
- It compares candidates.
- It explains selected and skipped skills.
- It plans chains across phases.
- It generates client-specific config.
- It learns from local feedback.
- It detects missing capabilities.
- It can be called through CLI or MCP.

It is still not a replacement for the underlying skills. It makes them easier to discover, combine, and verify.

## Who It Is For

SkillOS is useful for:

- Non-technical users who do not know which skill name to ask for.
- Developers who install many agent skills and want better routing.
- Teams that support multiple coding-agent clients.
- Builders of OpenClaw-like runtimes who need a capability probing protocol.
- Skill authors who want their skills to be discoverable through structured capability metadata.
- Agent developers who need stable JSON tools, evals, and decision traces.

## What Success Looks Like

SkillOS is working when:

- A vague task produces a reasonable chain rather than a random single skill.
- Different users get different recommendations based on what is installed locally.
- New skills are discovered without editing SkillOS source.
- The agent can explain why it selected and skipped candidates.
- Risky actions pass through a visible safety profile.
- Installers and zip packages can be tested in isolated temporary environments.
- Routing quality can be measured with evals and improved with feedback.

## What To Read Next

- [Installation](installation.md): install the agent-facing skill and local runtime.
- [Distribution Guide](distribution.md): understand public preview install paths and release packaging.
- [Client Adapters](client-adapters.md): see how SkillOS maps into different coding-agent clients.
- [Capability Card Schema](capability-card-schema.md): understand how installed skills are normalized for routing.
- [Safety Profiles](safety-profiles.md): configure suggest, approve, and auto behavior.
- [Routing Evals](evals.md): evaluate whether routing decisions are improving.
