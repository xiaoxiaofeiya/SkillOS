export type SkillSource = "user" | "system" | "client" | "tool" | "workflow";

export type SkillDomain =
  | "ui"
  | "design"
  | "browser"
  | "screenshot"
  | "security"
  | "deployment"
  | "data"
  | "document"
  | "cli"
  | "windows-app"
  | "openai"
  | "github"
  | "notion"
  | "openclaw"
  | "mcp"
  | "general";

export type TaskPhase =
  | "intake"
  | "repo-inspection"
  | "planning"
  | "implementation"
  | "verification"
  | "deployment"
  | "security-review"
  | "final-response";

export type SafetyProfile = "suggest" | "approve" | "auto";

export interface InstalledSkill {
  id: string;
  name: string;
  path: string;
  source: SkillSource;
  description: string;
  frontmatter: Record<string, unknown>;
}

export interface SkillCapabilityCard {
  id: string;
  name: string;
  path: string;
  source: SkillSource;
  description: string;
  domains: SkillDomain[];
  triggers: string[];
  inputs: string[];
  outputs: string[];
  sideEffects: string[];
  risk: "low" | "medium" | "high";
  requiresCredentials: boolean;
  verificationStrength: "none" | "low" | "medium" | "high";
  clientCompatibility: string[];
  confidence: number;
}

export interface CapabilityValidationResult {
  skillId: string;
  ok: boolean;
  issues: Array<{
    field: keyof SkillCapabilityCard | "frontmatter" | "body";
    severity: "warning" | "error";
    message: string;
  }>;
}

export interface RepoSignals {
  root: string;
  files: string[];
  frameworks: string[];
  packageManagers: string[];
  languages: string[];
  deployTargets: string[];
}

export interface SkillCandidate {
  skillId: string;
  name: string;
  score: number;
  phase: TaskPhase;
  matchedDomains: SkillDomain[];
  reasons: string[];
  expectedBenefit: string;
  skipped: boolean;
  skipReason?: string;
}

export interface SkillChainStep {
  id: string;
  phase: TaskPhase;
  skillIds: string[];
  title: string;
  objective: string;
  expectedOutputs: string[];
  requiresApproval: boolean;
  risk: "low" | "medium" | "high";
}

export interface SkillChain {
  id: string;
  task: string;
  safetyProfile: SafetyProfile;
  candidates: SkillCandidate[];
  steps: SkillChainStep[];
  gaps: SkillGap[];
  summary: string;
}

export interface SkillGap {
  domain: SkillDomain;
  reason: string;
  suggestedSkillNames: string[];
  canGenerateLightweightSkill: boolean;
}

export interface DecisionTrace {
  id: string;
  timestamp: string;
  task: string;
  repoSignals: RepoSignals | null;
  candidates: SkillCandidate[];
  selectedSkillIds: string[];
  skippedSkillIds: string[];
  outcome?: string;
  safetyProfile: SafetyProfile;
}

export interface RoutingMemory {
  version: 1;
  preferences: Array<{
    pattern: string;
    prefer: string[];
    avoid: string[];
    reason: string;
  }>;
}

export interface RoutingExplanation {
  decisionId: string;
  task: string;
  selectedSkillIds: string[];
  skippedSkillIds: string[];
  safetyProfile: SafetyProfile;
  topCandidates: SkillCandidate[];
  summary: string;
}

export interface EvalCase {
  id: string;
  task: string;
  expectedDomains: SkillDomain[];
  expectedSkillNames?: string[];
  phase?: TaskPhase;
}

export interface EvalReport {
  suite: string;
  total: number;
  skillRecall: number;
  skillPrecision: number;
  falsePositiveRate: number;
  cases: Array<{
    id: string;
    passed: boolean;
    selected: string[];
    expectedDomains: SkillDomain[];
    missingDomains: SkillDomain[];
    extraDomains: SkillDomain[];
  }>;
}

export interface SkillOSConfig {
  version: 1;
  safetyProfile: SafetyProfile;
  telemetry: false;
  modelEnhancement: {
    enabled: boolean;
    provider?: string;
    apiKeyEnv?: string;
    baseUrl?: string;
    embeddingModel?: string;
    maxCandidates?: number;
    enableLlmRerank?: boolean;
    enableSummaries?: boolean;
    enableFailureReview?: boolean;
    llmModel?: string;
    chatCompletionsPath?: string;
  };
  clients: Record<string, { enabled: boolean; configPath?: string }>;
}

export interface ClientConfigTarget {
  clientId: string;
  relativePath: string;
  targetPath: string;
  content: string;
  description: string;
  risk: "low" | "medium" | "high";
}

export interface ClientInstallPlan {
  clientId: string;
  displayName: string;
  root: string;
  safetyProfile: SafetyProfile;
  targets: ClientConfigTarget[];
  notes: string[];
}

export interface PresetDiff {
  clientId: string;
  targetPath: string;
  action: "create" | "update" | "unchanged";
  existingHash?: string;
  nextHash: string;
  preview: string;
}

export interface PackVerificationReport {
  ok: boolean;
  zipPath: string;
  checkedAt: string;
  entries: number;
  forbiddenMatches: string[];
  requiredMatches: string[];
  missingRequired: string[];
}

export interface ClientAdapter {
  id: string;
  displayName: string;
  detectCapabilities(root?: string): Promise<Record<string, unknown>>;
  renderPreset(config: SkillOSConfig): Promise<Record<string, string>>;
  renderInstallPlan(root: string, config: SkillOSConfig): Promise<ClientInstallPlan>;
  diffExistingConfig(root: string, plan: ClientInstallPlan): Promise<PresetDiff[]>;
  verifyInstall(root: string): Promise<Record<string, unknown>>;
  renderInvocationHints(chain: SkillChain): string[];
}

export interface OpenClawLikeAdapter extends ClientAdapter {
  listNativeSkills(root?: string): Promise<InstalledSkill[]>;
  listPlugins(root?: string): Promise<Array<Record<string, unknown>>>;
  listHooks(root?: string): Promise<Array<Record<string, unknown>>>;
  listMcpServers(root?: string): Promise<Array<Record<string, unknown>>>;
  installOrRenderPreset(config: SkillOSConfig): Promise<Record<string, string>>;
  mapSkillOSChainToClientWorkflow(chain: SkillChain): Record<string, unknown>;
}
