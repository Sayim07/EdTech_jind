'use client';

import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Channel, StreamChat } from 'stream-chat';
import { ArrowLeft, MessageSquare, Search, Users } from 'lucide-react';
import { Spinner } from '@/components/ui/Loaders';
import { ChatGate, ChatProvider } from './ChatProvider';
import { ConversationView, useOpenChannel } from './ConversationView';
import { channelKind, channelLabels, COURSE_TYPE, initials, isStaffUser, timeLabel } from './utils';

type Filter = 'all' | 'class' | 'ask';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'class', label: 'Class chats' },
  { id: 'ask', label: 'Private' },
];

export function Messenger({ role }: { role: string }) {
  return (
    <ChatProvider>
      <ChatGate>{(client) => <MessengerInner client={client} role={role} />}</ChatGate>
    </ChatProvider>
  );
}

function MessengerInner({ client, role }: { client: StreamChat; role: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get('channel');
  const staff = isStaffUser(client);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await client.queryChannels({ type: COURSE_TYPE, members: { $in: [client.userID as string] } }, { last_message_at: -1 }, { watch: true, state: true, limit: 50, message_limit: 30 });
      setChannels(list);
    } catch (e: any) {
      setError(e?.message || 'Could not load your conversations.');
      setChannels((c) => c ?? []);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sub = client.on((e) => {
      if (['notification.added_to_channel', 'notification.removed_from_channel', 'channel.deleted', 'channel.hidden'].includes(e.type)) load();
      else if (['message.new', 'notification.message_new', 'notification.mark_read', 'message.read', 'message.deleted', 'message.updated'].includes(e.type)) bump();
    });
    return () => sub.unsubscribe();
  }, [client, load]);

  const sorted = useMemo(() => {
    const t = (c: Channel) => (c.state.last_message_at ? new Date(c.state.last_message_at).getTime() : 0);
    return [...(channels || [])].sort((a, b) => t(b) - t(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, bump, channels?.map((c) => c.state.last_message_at?.getTime?.()).join()]);

  const visible = sorted.filter((c) => {
    if (filter !== 'all' && channelKind(c) !== filter) return false;
    if (!query.trim()) return true;
    const l = channelLabels(c, staff);
    return `${l.title} ${l.subtitle}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  const select = (id: string | null) => router.replace(id ? `/messages?channel=${encodeURIComponent(id)}` : '/messages', { scroll: false });
  const active = sorted.find((c) => c.id === activeId) || null;
  // A deep link to a conversation the list does not hold (for example a brand new private chat) is opened directly.
  const direct = useOpenChannel(client, COURSE_TYPE, activeId && !active && channels ? activeId : null);
  const openChannel = active || direct.channel;
  const totalUnread = sorted.reduce((n, c) => n + c.countUnread(), 0);

  if (channels === null) {
    return (
      <div className="flex h-[calc(100dvh-14rem)] items-center justify-center gap-2 text-sm text-gray-600" role="status">
        <Spinner size="sm" /> Loading conversations...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[460px] overflow-hidden rounded-2xl border border-gray-200 bg-white lg:h-[calc(100dvh-10rem)]">
      {/* Conversation list */}
      <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full min-h-0 flex-col border-gray-200 md:w-[340px] md:shrink-0 md:border-r`} aria-label="Conversations">
        <div className="space-y-3 border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            {totalUnread > 0 && <span className="rounded-full bg-amber-600 px-2 text-xs font-bold leading-5 text-white tabular-nums">{totalUnread} unread</span>}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-amber-600"
            />
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Filter conversations">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95 ${filter === f.id ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="m-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}{' '}
            <button type="button" onClick={load} className="font-semibold underline">
              Retry
            </button>
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sorted.length === 0 && !error ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <MessageSquare className="h-9 w-9 text-gray-400" aria-hidden />
              <p className="text-base font-semibold text-gray-900">No conversations yet</p>
              {role === 'STUDENT' ? (
                <>
                  <p className="text-sm text-gray-600">Your class chat and a private line to your instructor appear here after you enroll in a course.</p>
                  <Link href="/courses" className="mt-1 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95">
                    Browse courses
                  </Link>
                </>
              ) : (
                <p className="text-sm text-gray-600">Students appear here after they enroll in your courses. Their class chat and private questions will show up as they arrive.</p>
              )}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-600">No conversations match your search.</p>
          ) : (
            <ul>
              {visible.map((c) => (
                <ChannelRow key={c.id} channel={c} staff={staff} active={c.id === activeId} onSelect={() => select(c.id as string)} />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Open conversation */}
      <section className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`} aria-label="Conversation">
        {openChannel ? (
          <ConversationView
            key={openChannel.id}
            client={client}
            channel={openChannel}
            header={<ConversationHeader channel={openChannel} staff={staff} onBack={() => select(null)} />}
          />
        ) : activeId && direct.loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-600" role="status">
            <Spinner size="sm" /> Opening conversation...
          </div>
        ) : activeId && direct.error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
            <p className="text-base font-semibold text-gray-900">This conversation is not available</p>
            <p className="text-sm text-gray-600">{direct.error}</p>
            <button type="button" onClick={() => select(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 active:scale-95">
              Back to conversations
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300" aria-hidden />
            <p className="text-base font-semibold text-gray-900">Select a conversation</p>
            <p className="max-w-xs text-sm text-gray-600">Pick a class chat or a private message from the list to read and reply.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelRow({ channel, staff, active, onSelect }: { channel: Channel; staff: boolean; active: boolean; onSelect: () => void }) {
  const { title, subtitle } = channelLabels(channel, staff);
  const unread = channel.countUnread();
  const last = channel.state.messages[channel.state.messages.length - 1] as any;
  const preview = last ? (last.type === 'deleted' ? 'Message deleted' : `${last.user?.id === channel._client.userID ? 'You: ' : channelKind(channel) === 'class' ? `${(last.user?.name || '').split(' ')[0]}: ` : ''}${last.text || 'Attachment'}`) : 'No messages yet';
  const isClass = channelKind(channel) === 'class';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 active:bg-gray-100 ${active ? 'bg-amber-50' : ''}`}
      >
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isClass ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
          {isClass ? <Users className="h-5 w-5" /> : initials(title)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-[15px] ${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>{title}</span>
            <span className="shrink-0 text-xs text-gray-500">{timeLabel(channel.state.last_message_at)}</span>
          </span>
          <span className="block truncate text-xs text-gray-600">{subtitle}</span>
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{preview}</span>
            {unread > 0 && (
              <span className="min-w-[20px] shrink-0 rounded-full bg-amber-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white tabular-nums" aria-label={`${unread} unread`}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function ConversationHeader({ channel, staff, onBack }: { channel: Channel; staff: boolean; onBack: () => void }) {
  const { title, subtitle } = channelLabels(channel, staff);
  const count = channel.data?.member_count as number | undefined;
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 sm:px-4">
      <button type="button" onClick={onBack} aria-label="Back to conversations" className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95 md:hidden">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-gray-900">{title}</h2>
        <p className="truncate text-xs text-gray-600">
          {subtitle}
          {channelKind(channel) === 'class' && count ? ` · ${count} ${count === 1 ? 'member' : 'members'}` : ''}
        </p>
      </div>
    </div>
  );
}
