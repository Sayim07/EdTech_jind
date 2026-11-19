// One-time setup for a Stream app (run once per Stream app: development, then production):
//   node --env-file=.env scripts/stream-setup.mjs
// Creates the "course" channel type used for class chats and "Ask the instructor" chats. It is locked down:
// browsers cannot create channels, and only members can read or write. Instructors and admins can moderate.
import { SignJWT } from 'jose';

const key = process.env.STREAM_API_KEY;
const secret = process.env.STREAM_API_SECRET;
if (!key || !secret) throw new Error('Set STREAM_API_KEY and STREAM_API_SECRET first');

const H = 'https://chat.stream-io-api.com';
const token = await new SignJWT({ server: true }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(new TextEncoder().encode(secret));
const call = async (method, path, body) => {
  const res = await fetch(`${H}${path}?api_key=${key}`, { method, headers: { 'Content-Type': 'application/json', Authorization: token, 'stream-auth-type': 'jwt' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const base = (await call('GET', '/channeltypes/messaging')).body;
const deny = new Set(['create-channel', 'delete-channel-owner', 'update-channel-members-owner', 'update-channel-owner', 'truncate-channel-owner', 'recreate-channel-owner']);
const settings = {
  grants: { ...base.grants, user: base.grants.user.filter((g) => !deny.has(g)) },
  max_message_length: 2000,
  typing_events: true,
  read_events: true,
  reactions: true,
  replies: true,
  uploads: true,
  url_enrichment: true,
  search: true,
  mutes: true,
  commands: [],
};
let r = await call('POST', '/channeltypes', { name: 'course', ...settings });
if (r.status >= 400) r = await call('PUT', '/channeltypes/course', settings);
console.log(r.status < 400 ? 'Channel type "course" is ready.' : `Failed: ${r.body.message}`);
