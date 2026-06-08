# Capability Card Schema

Capability cards are generated from installed skill metadata and local client/tool signals.

Important fields:

- `id`: stable source-prefixed skill id.
- `domains`: normalized routing domains such as `ui`, `security`, `deployment`, `openclaw`, or `mcp`.
- `triggers`: keywords and phrases used for local routing.
- `inputs` and `outputs`: expected data shape at workflow level.
- `sideEffects`: local or external effects to consider under the safety profile.
- `risk`: `low`, `medium`, or `high`.
- `requiresCredentials`: true when the skill likely needs auth, API keys, or private connectors.
- `verificationStrength`: how much the skill can improve evidence quality.
- `clientCompatibility`: known or inferred compatible clients.

Validation is available through `validateCapabilityCard()` and `validateCapabilityCards()`. Empty descriptions are warnings because routing can still proceed with lower confidence; missing ids, names, domains, or invalid confidence values are errors.

`SkillCandidate` also includes `matchedDomains`. This is the task-specific subset of a capability card's domains that actually justified the current recommendation. Evals and explanations use `matchedDomains` so a broad skill is not penalized for capabilities that were not relevant to the current prompt.
