import type { SafetyProfile } from "./types.js";

export type SafetyAction =
  | "read-local"
  | "write-file"
  | "run-command"
  | "external-network"
  | "deploy"
  | "use-credential"
  | "send-private-data"
  | "destructive";

export type SafetyDecision = "allow" | "approval-required" | "blocked";

export interface SafetyGateInput {
  profile: SafetyProfile;
  action: SafetyAction;
  risk?: "low" | "medium" | "high";
}

export function evaluateSafetyGate(input: SafetyGateInput): {
  decision: SafetyDecision;
  reason: string;
} {
  if (input.profile === "suggest") {
    return { decision: "blocked", reason: "suggest mode does not execute actions" };
  }

  const highRisk = input.risk === "high" || ["deploy", "use-credential", "send-private-data", "destructive"].includes(input.action);
  const mediumRisk = input.risk === "medium" || ["write-file", "run-command", "external-network"].includes(input.action);

  if (input.profile === "approve") {
    if (highRisk || mediumRisk) return { decision: "approval-required", reason: "approve mode requires approval for medium/high-risk actions" };
    return { decision: "allow", reason: "low-risk action allowed in approve mode" };
  }

  if (highRisk) return { decision: "blocked", reason: "auto mode blocks high-risk actions unless an external policy overrides it" };
  return { decision: "allow", reason: "auto mode allows low/medium-risk actions" };
}
