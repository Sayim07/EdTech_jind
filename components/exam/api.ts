import { SESSION_HEADER } from '@/lib/proctor';
import { ApiError } from './types';

/** Fetch JSON and turn failures into ApiError (status 0 means the network itself failed). */
export async function apiJson<T = any>(url: string, init: RequestInit & { session?: string } = {}): Promise<T> {
  const { session, headers, ...rest } = init;
  const h: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  if (session) h[SESSION_HEADER] = session;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: h });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new ApiError(data?.error || data?.message || 'Something went wrong. Please try again.', res.status, data?.code, data);
  return data as T;
}

export const jsonInit = (method: string, body: unknown, session?: string): RequestInit & { session?: string } => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  session,
});

/** Time left on a clock that is synced from the server and driven by the monotonic performance clock. */
export class ServerClock {
  private offset = 0; // server epoch ms minus performance.now()
  synced = false;
  sync(serverNowIso: string | number | undefined | null) {
    const ms = typeof serverNowIso === 'number' ? serverNowIso : serverNowIso ? Date.parse(serverNowIso) : NaN;
    if (!Number.isFinite(ms)) return;
    this.offset = ms - performance.now();
    this.synced = true;
  }
  /** Server epoch milliseconds, advanced by performance.now() (immune to changes of the device clock). */
  now() {
    return performance.now() + this.offset;
  }
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
