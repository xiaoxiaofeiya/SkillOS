# Safety Profiles

SkillOS supports three install-time safety profiles:

- `suggest`: return recommendations and context only.
- `approve`: allow low-risk guidance automatically; require approval for medium/high-risk actions.
- `auto`: automate low/medium-risk actions; block high-risk actions unless an external policy allows them.

High-risk domains include deployment, credential use, public external sends, auth/security changes, and destructive operations.

Decision logs are stored locally in `.skillos/decision-log.jsonl` and are redacted before writing.

The core API exposes `evaluateSafetyGate()` so clients can map actions such as `write-file`, `run-command`, `external-network`, `deploy`, `use-credential`, `send-private-data`, and `destructive` to `allow`, `approval-required`, or `blocked`.

CLI write paths use the same gate. `preset apply` requires `--confirm`; `setup` writes generated presets under `.skillos/generated-presets/` but does not write real client configuration files.
