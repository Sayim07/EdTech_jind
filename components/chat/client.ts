'use client';

import { StreamChat } from 'stream-chat';

/**
 * One Stream connection per browser tab, shared by the messenger, the classroom drawer and the unread badge.
 * Users of it call acquireChat() and releaseChat(); the socket closes shortly after the last one lets go.
 */
export class ChatUnavailableError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

interface TokenResponse {
  apiKey: string;
  token: string;
  user: { id: string; name: string; image?: string };
}

async function fetchSession(): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch('/api/chat/token', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ChatUnavailableError('You appear to be offline. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new ChatUnavailableError('Please log in to use messaging.', 401);
    if (res.status === 503) throw new ChatUnavailableError('Messaging is not available right now.', 503);
    throw new ChatUnavailableError(data?.error || 'Could not start messaging. Please try again.', res.status);
  }
  return data as TokenResponse;
}

let client: StreamChat | null = null;
let connecting: Promise<StreamChat> | null = null;
let refs = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

async function connect(): Promise<StreamChat> {
  const session = await fetchSession();
  const c = StreamChat.getInstance(session.apiKey);
  if (c.userID && c.userID !== session.user.id) await c.disconnectUser();
  if (!c.userID) {
    let first: string | null = session.token;
    await c.connectUser({ id: session.user.id, name: session.user.name, image: session.user.image }, async () => {
      if (first) {
        const t = first;
        first = null;
        return t;
      }
      return (await fetchSession()).token;
    });
  }
  client = c;
  return c;
}

export function acquireChat(): Promise<StreamChat> {
  refs += 1;
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (client?.userID) return Promise.resolve(client);
  if (!connecting) {
    connecting = connect().finally(() => {
      connecting = null;
    });
  }
  return connecting.catch((e) => {
    refs = Math.max(0, refs - 1);
    throw e;
  });
}

export function releaseChat() {
  refs = Math.max(0, refs - 1);
  if (refs > 0 || closeTimer) return;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    if (refs === 0 && client) {
      const c = client;
      client = null;
      c.disconnectUser().catch(() => {});
    }
  }, 1500);
}

/** Call on logout so the next person on this browser never inherits the connection. */
export function resetChat() {
  const c = client;
  client = null;
  c?.disconnectUser().catch(() => {});
}
