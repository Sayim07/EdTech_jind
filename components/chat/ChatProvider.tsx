'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { StreamChat } from 'stream-chat';
import { RefreshCw, MessageSquareOff } from 'lucide-react';
import { Spinner } from '@/components/ui/Loaders';
import { acquireChat, releaseChat } from './client';

interface ChatState {
  client: StreamChat | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const ChatContext = createContext<ChatState>({ client: null, loading: true, error: null, retry: () => {} });
export const useChat = () => useContext(ChatContext);

/** Connects the signed-in user to Stream while mounted, and lets go of the connection when unmounted. */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let held = false;
    setError(null);
    setClient(null);
    acquireChat().then(
      (c) => {
        held = true;
        if (cancelled) return releaseChat();
        setClient(c);
      },
      (e) => {
        if (!cancelled) setError(e?.message || 'Could not start messaging. Please try again.');
      },
    );
    return () => {
      cancelled = true;
      if (held) releaseChat();
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return <ChatContext.Provider value={{ client, loading: !client && !error, error, retry }}>{children}</ChatContext.Provider>;
}

/** Shows the loading and error states, and renders children once connected. */
export function ChatGate({ children }: { children: (client: StreamChat) => React.ReactNode }) {
  const { client, loading, error, retry } = useChat();
  if (client) return <>{children(client)}</>;
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-600" role="status">
        <Spinner size="sm" />
        <span>Connecting to messages...</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center" role="alert">
      <MessageSquareOff className="w-9 h-9 text-gray-500" aria-hidden />
      <p className="text-base font-semibold text-gray-900">Messages are unavailable</p>
      <p className="text-sm text-gray-600 max-w-sm">{error}</p>
      <button
        type="button"
        onClick={retry}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95"
      >
        <RefreshCw className="w-4 h-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
