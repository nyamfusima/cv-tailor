export const SUPABASE_ROW_CAP = 1000;
export const ADMIN_SESSION_LIST_LIMIT = 1000;
export const ADMIN_STATS_TIMEZONE = "Africa/Johannesburg";

export interface SessionStatRow {
  user_email?: string | null;
  match_score?: number | null;
}

export interface AdminSessionStats {
  totalSessions: number;
  totalUsers: number;
  avgScore: number;
  todaySessions: number;
  listedSessions: number;
}

export function startOfTodayJohannesburg(now = new Date()): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_STATS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${date}T00:00:00+02:00`;
}

export function aggregateSessionStats(input: {
  totalSessions: number;
  todaySessions: number;
  listedSessions: number;
  rows: SessionStatRow[];
}): AdminSessionStats {
  const uniqueUsers = new Set(
    input.rows.map((row) => row.user_email).filter((email): email is string => Boolean(email)),
  ).size;
  const scores = input.rows
    .map((row) => row.match_score)
    .filter((score): score is number => typeof score === "number");
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;

  return {
    totalSessions: input.totalSessions,
    totalUsers: uniqueUsers,
    avgScore,
    todaySessions: input.todaySessions,
    listedSessions: input.listedSessions,
  };
}

export async function fetchAllPaged<T>(
  loadPage: (from: number, to: number) => Promise<T[]>,
  pageSize = SUPABASE_ROW_CAP,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await loadPage(from, from + pageSize - 1);
    if (!page.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
