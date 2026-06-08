# Optional Model Enhancement

SkillOS is local-first. Keyword, rule, repo-signal, phase, and risk routing work without external models.

When enabled, model enhancement can use OpenAI-compatible endpoints after local routing:

- Embeddings rerank: rerank already discovered local candidates by semantic similarity.
- LLM rerank: optionally ask a configured chat-completions compatible model to rerank known candidate ids.
- Skill summaries: optionally summarize capability cards for routing review.
- Failure review: optionally generate routing-rule improvement suggestions from user corrections.

```json
{
  "modelEnhancement": {
    "enabled": true,
    "provider": "openai-compatible",
    "apiKeyEnv": "OPENAI_API_KEY",
    "baseUrl": "https://api.openai.com/v1",
    "embeddingModel": "text-embedding-3-small",
    "maxCandidates": 24,
    "enableLlmRerank": false,
    "enableSummaries": false,
    "enableFailureReview": false,
    "llmModel": "",
    "chatCompletionsPath": "/chat/completions"
  }
}
```

Rules:

- Never enable model enhancement by default.
- Never send secrets intentionally.
- If the API key is missing, keep local routing and report the fallback reason.
- If the remote request fails, keep local routing and report the fallback reason.
- Use embeddings only to rerank already discovered local candidates; do not let the model invent installed skills.
- Use LLM rerank only with known `skillId` values; ignore invented ids.
- Keep summaries and failure reviews local unless explicitly enabled.
