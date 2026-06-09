# Market Context

This note explains the product positioning behind SkillOS. It is based on public documentation and ecosystem signals reviewed on 2026-06-09.

## What The Market Is Showing

Coding agents are no longer only chat interfaces that write code. The ecosystem is moving toward installable, reusable capabilities:

- OpenAI describes Codex plugins and skills as a way for Codex to do more specific work and use connected workflows instead of making users paste context manually: [OpenAI Codex plugins and skills](https://openai.com/academy/codex-plugins-and-skills/).
- Claude Code documents filesystem-based skills and plugin marketplaces: [Claude Code Skills](https://docs.claude.com/en/docs/claude-code/skills), [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).
- Cursor uses rules to give AI consistent guidance for code generation and workflows: [Cursor Rules](https://docs.cursor.com/context/rules-for-ai).
- Windsurf Cascade Skills explicitly teach multi-step workflows and use progressive disclosure so only `name` and `description` are shown until a skill is invoked: [Windsurf Cascade Skills](https://docs.windsurf.com/windsurf/cascade/skills).
- OpenHands exposes AgentSkills through `SKILL.md` and `invoke_skill()`: [OpenHands Agent Skills](https://docs.openhands.dev/sdk/guides/skill).
- MCP client best practices recommend progressive discovery when tool definitions would consume too much context: [MCP Client Best Practices](https://modelcontextprotocol.io/docs/develop/clients/client-best-practices).
- OpenClaw separates tools, skills, plugins, hooks, MCP, and runtime capabilities: [OpenClaw Tools](https://docs.openclaw.ai/tools), [OpenClaw CLI](https://docs.openclaw.ai/cli).
- The Agent Skills CLI provides a simple install path such as `npx skills add`: [skills.sh CLI](https://skills.sh/docs/cli).

The shared direction is clear: agents are becoming extensible operating environments.

## The Gap

The market is adding more capabilities, but users still face a practical problem:

```text
I installed many skills. Now how does the agent know which one to use?
```

Most ecosystems provide one or more of these pieces:

- A place to install a skill.
- A file format for instructions.
- A plugin marketplace.
- A rules or hooks mechanism.
- MCP tools.
- Client-specific configuration.

Those are valuable, but they do not fully solve cross-client orchestration:

- The user may not know skill names.
- A task may need several skills in a sequence.
- The right skill may depend on the project phase.
- Different users have different installed capabilities.
- Loading every skill wastes context.
- Risky actions need safety gates.
- The agent should explain why it selected or skipped a capability.
- Teams need measurable routing quality, not only vibes.

This is where SkillOS positions itself.

## SkillOS Positioning

SkillOS is not trying to replace Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw, MCP, or Agent Skills.

SkillOS is the layer between user intent and installed capabilities.

It answers:

- What is installed here?
- What can each capability do?
- What does this task really need?
- Which skills should be used now?
- Which skills should be used later?
- Which skills should be skipped?
- What is risky?
- What proof should the agent collect before finishing?
- How should this be expressed in each client?

That makes SkillOS a local-first skill operating layer rather than a single-purpose skill.

## Messaging Principles

The product should be explained in plain language:

- Do not start with package names.
- Start with the user's pain: "I do not know which skill to ask for."
- Show a concrete before-and-after workflow.
- Make it clear that SkillOS chooses chains, not only one tool.
- Emphasize local-first privacy and safety.
- Explain that new skills can be discovered without changing SkillOS code.
- Keep advanced terms like MCP, adapter, and capability card available, but not required for first understanding.

## The Short Pitch

SkillOS helps your coding agent stop guessing.

It looks at what is installed, understands what the task needs, chooses the right skill chain, keeps risky steps under control, and explains the decision.

For users, that means fewer magic words to memorize.

For developers, that means a real routing layer across skills, tools, plugins, MCP servers, and agent clients.

For teams, that means local logs, safety profiles, evals, and repeatable installation checks.
