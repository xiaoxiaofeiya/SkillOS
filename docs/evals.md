# Routing Evals

Routing evals measure whether SkillOS selects the right skill domains for realistic user prompts.

Core metrics:

- Skill recall: required domains selected.
- Skill precision: selected domains that are relevant.
- False positive rate: irrelevant extra domains.
- Phase recall: selected skills match the current workflow phase.
- User correction rate: how often feedback says a skill should or should not have been used.

The built-in default suite contains at least 300 natural, casual prompts across UI, deployment, security, data, documents, CLI, Windows apps, GitHub/CI, OpenAI docs, MCP, OpenClaw, Chinese casual prompts, and negative prompts.

Public preview acceptance targets:

- `skillRecall >= 0.85`
- `skillPrecision >= 0.70`
- `falsePositiveRate <= 0.30`

Run:

```bash
skillos eval run
skillos eval run --format json
```
