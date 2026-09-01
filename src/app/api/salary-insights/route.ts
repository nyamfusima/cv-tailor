import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,ngqongwaayandisa@gmail.com,zengetwasisipho@gmail.com")
  .split(",").map((e) => e.trim());

type TrendDirection = "up" | "down" | "flat" | "unknown";

type SalaryInsights = {
  minSalary?: number;
  maxSalary?: number;
  averageSalary?: number;
  currency?: string;
  trend: TrendDirection;
  trendPercent?: number;
  source?: string;
};

type CandidateResult = {
  insights: SalaryInsights;
  source: string;
};

const NUMBER_KEYS_MIN = [
  "min_salary",
  "minimum_salary",
  "salary_min",
  "salary_low",
  "low_salary",
];

const NUMBER_KEYS_MAX = [
  "max_salary",
  "maximum_salary",
  "salary_max",
  "salary_high",
  "high_salary",
];

const NUMBER_KEYS_AVG = [
  "avg_salary",
  "average_salary",
  "mean_salary",
  "median_salary",
  "salary_average",
];

const NUMBER_KEYS_TREND = [
  "trend",
  "salary_trend",
  "trend_direction",
  "salary_trend_direction",
];

const NUMBER_KEYS_TREND_PERCENT = [
  "trend_percent",
  "trend_percentage",
  "salary_trend_percent",
  "salary_trend_percentage",
  "change_percent",
];

const CURRENCY_KEYS = [
  "currency",
  "currency_code",
  "salary_currency",
  "code",
];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function addToMap(map: Map<string, unknown[]>, key: string, value: unknown) {
  const normalized = normalizeKey(key);
  const existing = map.get(normalized) || [];
  existing.push(value);
  map.set(normalized, existing);
}

function flattenObject(value: unknown, map: Map<string, unknown[]>) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const entry of value) flattenObject(entry, map);
    return;
  }
  if (typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    addToMap(map, key, nested);
    flattenObject(nested, map);
  }
}

function pickFirstValue(map: Map<string, unknown[]>, keys: string[]): unknown {
  for (const key of keys) {
    const values = map.get(normalizeKey(key));
    if (values && values.length > 0) return values[0];
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/g);
    if (!cleaned || cleaned.length === 0) return undefined;
    const parsed = Number(cleaned[0]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  if (trimmed.includes("$")) return "USD";
  if (/\bEUR\b/i.test(trimmed)) return "EUR";
  if (/\bGBP\b/i.test(trimmed)) return "GBP";
  if (/\bZAR\b/i.test(trimmed)) return "ZAR";

  return undefined;
}

function parseTrend(value: unknown): TrendDirection {
  if (typeof value === "number") {
    if (value > 0) return "up";
    if (value < 0) return "down";
    return "flat";
  }
  if (typeof value !== "string") return "unknown";

  const lower = value.toLowerCase();
  if (/(up|rise|rising|increase|positive|bull)/.test(lower)) return "up";
  if (/(down|fall|falling|decrease|negative|bear)/.test(lower)) return "down";
  if (/(flat|stable|neutral|steady|same)/.test(lower)) return "flat";
  return "unknown";
}

function parseSalaryRangeText(value: unknown): { min?: number; max?: number } {
  if (typeof value !== "string") return {};
  const matches = value.replace(/,/g, "").match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return {};
  if (matches.length === 1) {
    const one = Number(matches[0]);
    return Number.isFinite(one) ? { min: one, max: one } : {};
  }
  const min = Number(matches[0]);
  const max = Number(matches[1]);
  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

function parseFromPayload(payload: unknown, source: string): CandidateResult | null {
  if (!payload || typeof payload !== "object") return null;

  const map = new Map<string, unknown[]>();
  flattenObject(payload, map);

  const minSalary =
    toNumber(pickFirstValue(map, NUMBER_KEYS_MIN)) ??
    parseSalaryRangeText(pickFirstValue(map, ["salary_range", "range"])).min;

  const maxSalary =
    toNumber(pickFirstValue(map, NUMBER_KEYS_MAX)) ??
    parseSalaryRangeText(pickFirstValue(map, ["salary_range", "range"])).max;

  const averageSalary = toNumber(pickFirstValue(map, NUMBER_KEYS_AVG));
  const trendValue = pickFirstValue(map, NUMBER_KEYS_TREND);
  const trendPercent = toNumber(pickFirstValue(map, NUMBER_KEYS_TREND_PERCENT));
  const currency =
    parseCurrency(pickFirstValue(map, CURRENCY_KEYS)) ??
    parseCurrency(pickFirstValue(map, ["salary_range", "range"]));

  const trend = parseTrend(trendValue ?? trendPercent);

  if (!minSalary && !maxSalary && !averageSalary && trend === "unknown") return null;

  return {
    source,
    insights: {
      minSalary,
      maxSalary,
      averageSalary,
      currency,
      trend,
      trendPercent: trendPercent !== undefined ? trendPercent : undefined,
      source,
    },
  };
}

function mergeInsights(primary: SalaryInsights, incoming: SalaryInsights): SalaryInsights {
  return {
    minSalary: primary.minSalary ?? incoming.minSalary,
    maxSalary: primary.maxSalary ?? incoming.maxSalary,
    averageSalary: primary.averageSalary ?? incoming.averageSalary,
    currency: primary.currency ?? incoming.currency,
    trend: primary.trend !== "unknown" ? primary.trend : incoming.trend,
    trendPercent: primary.trendPercent ?? incoming.trendPercent,
    source: primary.source ?? incoming.source,
  };
}

function makeParams(jobTitle: string, location: string) {
  return new URLSearchParams({
    job_title: jobTitle,
    location,
  });
}

async function tryEndpoint(
  host: string,
  apiKey: string,
  endpoint: string,
  jobTitle: string,
  location: string,
): Promise<CandidateResult | null> {
  const params = makeParams(jobTitle, location);
  const url = `https://${host}${endpoint}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return parseFromPayload(data, endpoint);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) {
      const userData = await getUserCredits(user.id);
      if (!userData || !hasJobCredits(userData)) {
        return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
      }
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const location = typeof body?.location === "string" ? body.location.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY;
    const rapidApiHost = process.env.RAPIDAPI_SALARY_HOST;

    if (!rapidApiKey || !rapidApiHost) {
      return NextResponse.json({
        ok: false,
        reason: "Salary API not configured",
      });
    }

    const endpointCandidates = [
      "/estimated-salary",
      "/salary-estimation",
      "/salary-insights",
      "/salary-trends",
      "/salary-trend",
    ];

    let merged: SalaryInsights = { trend: "unknown" };

    for (const endpoint of endpointCandidates) {
      const result = await tryEndpoint(rapidApiHost, rapidApiKey, endpoint, title, location || "Remote");
      if (!result) continue;
      merged = mergeInsights(merged, result.insights);
    }

    if (!merged.minSalary && !merged.maxSalary && !merged.averageSalary && merged.trend === "unknown") {
      return NextResponse.json({
        ok: false,
        reason: "No salary data found for this role",
      });
    }

    return NextResponse.json({
      ok: true,
      insights: merged,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch salary insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

