const IST = 'Asia/Kolkata';

/** Fixed time zone so the server render and the browser always print the same text (no hydration mismatch). */
const dt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const d = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
const t = new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "19 Nov 2026, 11:42:08 am IST" */
export const formatDateTime = (v: string | Date) => `${dt.format(new Date(v))} IST`;
export const formatDate = (v: string | Date) => d.format(new Date(v));
export const formatTime = (v: string | Date) => `${t.format(new Date(v))} IST`;
/** "2026-11-19" in IST, for comparing against <input type="date"> values. */
export const istDay = (v: string | Date) => ymd.format(new Date(v));
