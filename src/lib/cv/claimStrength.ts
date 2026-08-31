import type { ClaimStrengthWarning } from "./types";

interface InflationRule {
  from: RegExp;
  to: RegExp;
  riskType: ClaimStrengthWarning["riskType"];
  severity: ClaimStrengthWarning["severity"];
  reason: string;
}

const RULES: InflationRule[] = [
  {
    from: /\bassisted\b/i,
    to: /\b(led|managed|owned|directed|headed)\b/i,
    riskType: "ownership_inflation",
    severity: "high",
    reason: "assisted became a leadership or ownership verb",
  },
  {
    from: /\bsupported\b/i,
    to: /\b(managed|led|owned|directed)\b/i,
    riskType: "leadership_inflation",
    severity: "high",
    reason: "supported became managed/led/owned",
  },
  {
    from: /\bparticipated\b/i,
    to: /\b(owned|led|ran)\b/i,
    riskType: "ownership_inflation",
    severity: "high",
    reason: "participated became owned/led",
  },
  {
    from: /\bcontributed\b/i,
    to: /\b(architected|owned|led)\b/i,
    riskType: "ownership_inflation",
    severity: "high",
    reason: "contributed became architected/owned/led",
  },
  {
    from: /\bworked with\b/i,
    to: /\b(expert in|proficient in|specialist in)\b/i,
    riskType: "proficiency_inflation",
    severity: "high",
    reason: "worked with became a proficiency claim",
  },
  {
    from: /\b(learned|studied|familiar with|exposure to)\b/i,
    to: /\b(implemented|built|shipped|deployed)\b/i,
    riskType: "proficiency_inflation",
    severity: "high",
    reason: "learning/exposure became professional implementation",
  },
  {
    from: /\bexposure\b/i,
    to: /\b(proficien|expert|fluent)\b/i,
    riskType: "proficiency_inflation",
    severity: "high",
    reason: "exposure became proficiency",
  },
  {
    from: /\b(collaborat|as part of (the )?team|with the team)\b/i,
    to: /\b(independently|solely|single-handedly)\b/i,
    riskType: "autonomy_inflation",
    severity: "high",
    reason: "team delivery became independent delivery",
  },
  {
    from: /\bprepared\b/i,
    to: /\b(directed|set strategy|owned strategy)\b/i,
    riskType: "ownership_inflation",
    severity: "high",
    reason: "prepared information became directed strategy",
  },
  {
    from: /\bcloud\b/i,
    to: /\bcloud-native architecture\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "a cloud project became cloud-native architecture",
  },
  {
    from: /\bapis?\b/i,
    to: /\bdistributed systems?\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "APIs became a distributed system",
  },
  {
    from: /\b(client software|application|app)\b/i,
    to: /\benterprise-scale\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "client software became an enterprise-scale platform",
  },
  {
    from: /\bprototype\b/i,
    to: /\bproduction service\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "a prototype became a production service",
  },
  {
    from: /\bintegration\b/i,
    to: /\bmicroservices?\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "integration work became microservices",
  },
  {
    from: /\btest(ing|s)?\b/i,
    to: /\boperational (excellence|stability)\b/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "testing became operational excellence",
  },
  {
    from: /\b(reliability|reliable|uptime)\b/i,
    to: /\bfault[- ]toleran/i,
    riskType: "scale_inflation",
    severity: "high",
    reason: "ordinary reliability work became a fault-tolerant system",
  },
];

export const UNSUPPORTED_SCOPE_TERMS = [
  { term: /\bcloud-native architecture\b/i, label: "cloud-native architecture" },
  { term: /\bdistributed systems?\b/i, label: "distributed systems" },
  { term: /\benterprise-scale\b/i, label: "enterprise-scale" },
  { term: /\boperational (stability|excellence)\b/i, label: "operational stability" },
  { term: /\bfault[- ]toleran(?:ce|t)\b/i, label: "fault tolerance" },
  { term: /\bmicroservices?\b/i, label: "microservices" },
  { term: /\baws\b/i, label: "AWS" },
  { term: /\bci\s*\/\s*cd\b/i, label: "CI/CD" },
  { term: /\bon-call\b/i, label: "on-call" },
  { term: /\bmonitoring\b/i, label: "monitoring" },
];

export function assessUnsupportedScope(
  originalText: string,
  tailoredText: string,
  sourceBulletId: string,
): ClaimStrengthWarning | null {
  for (const item of UNSUPPORTED_SCOPE_TERMS) {
    if (item.term.test(tailoredText) && !item.term.test(originalText)) {
      return {
        sourceBulletId,
        originalText,
        tailoredText,
        riskType: "scale_inflation",
        severity: "high",
        reason: `${item.label} is not evidenced in the source`,
      };
    }
  }
  return null;
}

const OUTCOME = /\b(increased|decreased|reduced|grew|saved|generated|resulting in|which led)\b/i;

export function assessRewrite(
  originalText: string,
  tailoredText: string,
  sourceBulletId: string,
): ClaimStrengthWarning | null {
  if (!tailoredText || normalizeLoose(originalText) === normalizeLoose(tailoredText)) return null;

  for (const rule of RULES) {
    if (rule.from.test(originalText) && rule.to.test(tailoredText) && !rule.to.test(originalText)) {
      return {
        sourceBulletId,
        originalText,
        tailoredText,
        riskType: rule.riskType,
        severity: rule.severity,
        reason: rule.reason,
      };
    }
  }

  if (OUTCOME.test(tailoredText) && !OUTCOME.test(originalText)) {
    return {
      sourceBulletId,
      originalText,
      tailoredText,
      riskType: "causality_inflation",
      severity: "high",
      reason: "rewrite added a business result that was not in the source",
    };
  }

  return null;
}

function normalizeLoose(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
