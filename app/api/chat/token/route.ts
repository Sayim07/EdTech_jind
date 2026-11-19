import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { chatConfigured, streamPublicKey, upsertUsers, userToken } from '@/lib/chat/stream';
import { ensureUserChannels, toChatUser } from '@/lib/chat/sync';

/**
 * Gives the signed-in user what the browser needs to connect to Stream as themselves. The token is created here with the
 * secret key, lasts an hour, and only works for this user. The browser asks again when it expires.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  if (!chatConfigured()) return NextResponse.json({ error: 'Messaging is not available right now.' }, { status: 503 });

  const chatUser = toChatUser(user);
  try {
    await upsertUsers([chatUser]);
    await ensureUserChannels(user);
  } catch (err) {
    console.error('Chat token error:', err);
    return NextResponse.json({ error: 'Could not start messaging. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({
    apiKey: streamPublicKey(),
    token: await userToken(user.id),
    user: { id: chatUser.id, name: chatUser.name, image: chatUser.image || undefined },
  });
}
