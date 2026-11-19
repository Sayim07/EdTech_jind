'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Loaders';
import { ChatGate, ChatProvider } from './ChatProvider';
import { ConversationView, useOpenChannel } from './ConversationView';
import { COURSE_TYPE } from './utils';
import type { StreamChat } from 'stream-chat';

type Tab = 'class' | 'ask';

interface Props {
  courseId: string;
  courseTitle: string;
  role: string;
  /** True when this person is an enrolled student (admins and instructors previewing are not). */
  enrolled: boolean;
  onClose: () => void;
}

export default function ClassChatDrawer(props: Props) {
  const [tab, setTab] = useState<Tab>('class');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'class', label: 'Class chat' },
    { id: 'ask', label: props.role === 'STUDENT' ? 'Ask the instructor' : 'Private chats' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-stretch" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <aside role="dialog" aria-modal="true" aria-label="Class chat" className="flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-full sm:w-[420px] sm:rounded-none">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Chat</h2>
            <p className="truncate text-xs text-gray-600">{props.courseTitle}</p>
          </div>
          <button ref={closeRef} type="button" onClick={props.onClose} aria-label="Close chat" className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div role="tablist" aria-label="Chat type" className="flex gap-1 border-b border-gray-200 px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition ${tab === t.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1" role="tabpanel">
          <ChatProvider>
            <ChatGate>{(client) => (tab === 'class' ? <ClassTab client={client} {...props} /> : <AskTab client={client} {...props} />)}</ChatGate>
          </ChatProvider>
        </div>
      </aside>
    </div>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <MessageSquare className="h-9 w-9 text-gray-400" aria-hidden />
      <p className="text-base font-semibold text-gray-900">{title}</p>
      <p className="max-w-xs text-sm text-gray-600">{body}</p>
      {action}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-600" role="status">
      <Spinner size="sm" /> {text}
    </div>
  );
}

function ClassTab({ client, courseId, enrolled, role }: { client: StreamChat } & Props) {
  const { channel, loading, error, retry } = useOpenChannel(client, COURSE_TYPE, `c-${courseId}`);
  if (loading) return <Loading text="Opening class chat..." />;
  if (!channel) {
    const notYet = !enrolled && role === 'STUDENT';
    return (
      <Notice
        title={notYet ? 'Join the class to chat' : 'Class chat is not open yet'}
        body={notYet ? 'The class chat is for students enrolled in this course.' : role === 'STUDENT' ? error || 'It opens as soon as the class is set up. Please try again in a moment.' : 'The class chat opens when the first student enrolls, and you will be added to it automatically.'}
        action={
          role === 'STUDENT' ? (
            <button type="button" onClick={retry} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95">
              Try again
            </button>
          ) : undefined
        }
      />
    );
  }
  return <ConversationView client={client} channel={channel} />;
}

function AskTab({ client, courseId, role }: { client: StreamChat } & Props) {
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isStudent = role === 'STUDENT';

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    setError(null);
    fetch('/api/chat/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || 'Could not open the chat.');
        if (!cancelled) setId(d.id);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [courseId, isStudent, attempt]);

  const { channel, loading, error: openError, retry } = useOpenChannel(client, COURSE_TYPE, id);

  if (!isStudent) {
    return (
      <Notice
        title="Private chats"
        body="Students message you privately from here. Their questions are in your inbox."
        action={
          <Link href="/messages" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95">
            Open messages
          </Link>
        }
      />
    );
  }
  if (error || openError) {
    return (
      <Notice
        title="Could not open the chat"
        body={error || openError || ''}
        action={
          <button
            type="button"
            onClick={() => (error ? setAttempt((n) => n + 1) : retry())}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95"
          >
            Try again
          </button>
        }
      />
    );
  }
  if (!id || loading || !channel) return <Loading text="Opening your private chat..." />;
  return <ConversationView client={client} channel={channel} />;
}
