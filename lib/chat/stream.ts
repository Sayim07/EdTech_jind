import { SignJWT } from 'jose';

/**
 * Minimal Stream Chat client over its REST API (the same hand-written style as lib/payments and lib/s3), so it runs
 * on Cloudflare Workers without Node-only libraries. Server side only: it uses STREAM_API_SECRET.
 */
const HOST = 'https://chat.stream-io-api.com';

const apiKey = () => process.env.STREAM_API_KEY?.trim() || '';
const apiSecret = () => process.env.STREAM_API_SECRET?.trim() || '';

export const chatConfigured = () => Boolean(apiKey() && apiSecret() && process.env.CHAT_ENABLED !== 'false');
/** The key the browser needs. It is public by design; the secret never leaves the server. */
export const streamPublicKey = () => apiKey();

const enc = () => new TextEncoder().encode(apiSecret());

/** Token that lets one signed-in user connect to Stream as themselves. Short lived: the browser asks for a new one. */
export async function userToken(userId: string, ttlSeconds = 3600) {
  return new SignJWT({ user_id: userId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(enc());
}

async function serverToken() {
  return new SignJWT({ server: true }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(enc());
}

export class StreamError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
  if (!chatConfigured()) throw new StreamError('Messaging is not set up', 503);
  const qs = new URLSearchParams({ api_key: apiKey(), ...query });
  const res = await fetch(`${HOST}${path}?${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: await serverToken(), 'stream-auth-type': 'jwt' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StreamError(data?.message || `Stream responded with ${res.status}`, res.status);
  return data as T;
}

export interface ChatUser {
  id: string;
  name: string;
  image?: string | null;
  /** "student" | "instructor" | "admin": shown next to names in the chat. */
  appRole: string;
}

/** Creates or updates people in Stream. Only a name, picture and role go there, never profile details. */
export async function upsertUsers(users: ChatUser[]) {
  if (!users.length) return;
  const map: Record<string, unknown> = {};
  for (const u of users) map[u.id] = { id: u.id, name: u.name, ...(u.image ? { image: u.image } : {}), app_role: u.appRole };
  await call('POST', '/users', { users: map });
}

export interface ChannelSpec {
  type: string;
  id: string;
  name: string;
  /** Everyone who may read and write. */
  members: string[];
  /** Who can delete messages and mute people (instructors, admins). */
  moderators: string[];
  createdBy: string;
  /** Extra searchable fields, for example { course_id, kind }. */
  extra?: Record<string, unknown>;
}

const chunk = <T,>(items: T[], size = 100) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** Makes the channel exist and brings its member list in line with `members` (adds the missing, removes the extra). */
export async function ensureChannel(spec: ChannelSpec) {
  const path = `/channels/${spec.type}/${encodeURIComponent(spec.id)}`;
  // Stream handles 100 members per request, so a big class is read and written in pages.
  const have = new Set<string>();
  for (let offset = 0; ; offset += 100) {
    const state = await call<{ members?: { user_id: string }[] }>('POST', `${path}/query`, {
      data: { name: spec.name, members: spec.members.slice(0, 100), created_by_id: spec.createdBy, ...(spec.extra || {}) },
      state: true,
      watch: false,
      members: { limit: 100, offset },
    });
    const page = state.members || [];
    page.forEach((m) => have.add(m.user_id));
    if (page.length < 100) break;
  }
  const want = new Set(spec.members);
  const add = spec.members.filter((m) => !have.has(m));
  const remove = [...have].filter((m) => !want.has(m));
  for (const ids of chunk(add)) await call('POST', path, { add_members: ids });
  for (const ids of chunk(remove)) await call('POST', path, { remove_members: ids });
  if (spec.moderators.length) await call('POST', path, { add_moderators: spec.moderators }).catch(() => {});
}

/** Adds one person without touching anyone else (cheap, used when a single student joins). */
export async function addMember(type: string, id: string, userId: string) {
  await call('POST', `/channels/${type}/${encodeURIComponent(id)}`, { add_members: [userId] });
}

export async function removeMember(type: string, id: string, userId: string) {
  await call('POST', `/channels/${type}/${encodeURIComponent(id)}`, { remove_members: [userId] }).catch((e) => {
    if (!(e instanceof StreamError && e.status === 404)) throw e;
  });
}

export async function deleteChannel(type: string, id: string) {
  await call('DELETE', `/channels/${type}/${encodeURIComponent(id)}`, undefined, { hard_delete: 'true' }).catch((e) => {
    if (!(e instanceof StreamError && e.status === 404)) throw e;
  });
}

/** Finds channels by a custom field, for example every "Ask the instructor" chat of one course. */
export async function queryChannels(filter: Record<string, unknown>, limit = 100) {
  const data = await call<{ channels?: { channel: { id: string; type: string }; members?: { user_id: string }[] }[] }>('POST', '/channels', {
    filter_conditions: filter,
    limit,
    state: true,
  });
  return data.channels || [];
}

export async function deleteUsers(ids: string[]) {
  if (!ids.length) return;
  await call('POST', '/users/delete', { user_ids: ids, user: 'hard', messages: 'hard', conversations: 'hard' });
}
