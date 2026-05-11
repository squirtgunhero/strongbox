export interface MonthlyGroup {
  month: string; // YYYY-MM
  total: number;
  count: number;
}

export function groupByMonth<T>(
  records: T[],
  getDate: (r: T) => string | null,
  getValue: (r: T) => number
): MonthlyGroup[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const d = getDate(r);
    if (!d) continue;
    const month = d.slice(0, 7);
    const bucket = buckets.get(month) || { total: 0, count: 0 };
    bucket.total += getValue(r);
    bucket.count += 1;
    buckets.set(month, bucket);
  }
  return Array.from(buckets.entries())
    .map(([month, { total, count }]) => ({ month, total, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type AgingBucket = "current" | "30" | "60" | "90" | "90+";

export function agingBucket(
  maturityDate: string | null,
  asOf: string
): AgingBucket | null {
  if (!maturityDate) return null;
  const mat = new Date(maturityDate + "T00:00:00Z").getTime();
  const now = new Date(asOf + "T00:00:00Z").getTime();
  const daysOverdue = Math.floor((now - mat) / (1000 * 60 * 60 * 24));
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "30";
  if (daysOverdue <= 60) return "60";
  if (daysOverdue <= 90) return "90";
  return "90+";
}

export function weightedAverageRate(
  loans: { current_principal: number; interest_rate: number }[]
): number {
  const totalPrincipal = loans.reduce(
    (s, l) => s + Number(l.current_principal),
    0
  );
  if (totalPrincipal === 0) return 0;
  const weightedSum = loans.reduce(
    (s, l) => s + Number(l.current_principal) * Number(l.interest_rate),
    0
  );
  return weightedSum / totalPrincipal;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerRow = headers.join(",");
  const dataRows = rows.map((r) =>
    headers.map((h) => escape(r[h])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}
