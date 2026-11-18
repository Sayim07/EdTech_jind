export interface Faq {
  q: string;
  a: string;
}

/** Parses lesson durations such as "14:20" (mm:ss), "30 mins", "1h 15m" into minutes. */
export function durationToMinutes(duration?: string | null): number {
  if (!duration) return 0;
  const d = duration.trim().toLowerCase();

  const clock = d.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    // h:mm:ss when three parts, otherwise mm:ss
    return clock[3] !== undefined
      ? Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3]) / 60
      : Number(clock[1]) + Number(clock[2]) / 60;
  }

  let minutes = 0;
  const h = d.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const m = d.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (h) minutes += parseFloat(h[1]) * 60;
  if (m) minutes += parseFloat(m[1]);
  return minutes;
}

/** Admin override wins; otherwise the sum of lesson durations, rounded to one decimal. */
export function courseTotalHours(
  override: number | null | undefined,
  lessons: { duration?: string | null }[]
): number {
  if (override && override > 0) return override;
  const minutes = lessons.reduce((sum, l) => sum + durationToMinutes(l.duration), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatHours(hours: number): string {
  if (!hours) return 'Self-paced';
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function parseFaqs(raw?: string | null): Faq[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((f) => f && typeof f.q === 'string' && typeof f.a === 'string' && f.q.trim() && f.a.trim())
      .map((f) => ({ q: f.q.trim(), a: f.a.trim() }));
  } catch {
    return [];
  }
}

/** Validates admin input and returns the JSON string to store (or null when empty). */
export function serializeFaqs(input: unknown): string | null {
  if (!Array.isArray(input)) return null;
  const clean = input
    .filter((f: any) => f && typeof f.q === 'string' && typeof f.a === 'string')
    .map((f: any) => ({ q: f.q.trim().slice(0, 200), a: f.a.trim().slice(0, 2000) }))
    .filter((f) => f.q && f.a)
    .slice(0, 30);
  return clean.length ? JSON.stringify(clean) : null;
}
