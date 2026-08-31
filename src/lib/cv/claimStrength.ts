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
];

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
