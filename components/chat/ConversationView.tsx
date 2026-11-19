'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Channel, FormatMessageResponse, StreamChat } from 'stream-chat';
import { ArrowDown, FileText, Heart, Paperclip, Reply, Send, ThumbsUp, Trash2, X } from 'lucide-react';
import { ButtonSpinner, Spinner } from '@/components/ui/Loaders';
import { dayLabel, initials, roleLabel } from './utils';

type Msg = FormatMessageResponse;
interface Pending {
  id: string;
  name: string;
  isImage: boolean;
  url?: string;
  previewUrl?: string;
  size?: number;
  status: 'uploading' | 'done' | 'error';
}

const REACTIONS = [
  { type: 'like', label: 'Like', Icon: ThumbsUp },
  { type: 'love', label: 'Love', Icon: Heart },
] as const;
const MAX_LEN = 4000;
const MAX_FILE = 25 * 1024 * 1024;

const timeOf = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const sizeOf = (n?: number) => (n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`) : '');

function Avatar({ name, image, own }: { name?: string; image?: string; own?: boolean }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover bg-gray-200" />;
  }
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${own ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}
    >
      {initials(name)}
    </span>
  );
}

/** One open conversation: messages, typing, reactions, replies, attachments and the composer. */
export function ConversationView({ client, channel, header }: { client: StreamChat; channel: Channel; header?: React.ReactNode }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const me = client.userID as string;
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const myMember = channel.state.members[me];
  const canModerate = myMember?.channel_role === 'channel_moderator' || (myMember as any)?.is_moderator === true;

  useEffect(() => {
    const sub = channel.on((e) => {
      if (e.type === 'typing.start' || e.type === 'typing.stop' || e.type.startsWith('message') || e.type.startsWith('reaction') || e.type === 'channel.updated') bump();
      if (e.type === 'message.new' && e.user?.id !== me && document.visibilityState === 'visible') channel.markRead().catch(() => {});
    });
    channel.markRead().catch(() => {});
    setHasMore(channel.state.messagePagination?.hasPrev ?? true);
    return () => sub.unsubscribe();
  }, [channel, me]);

  // Keep the newest message in view unless the reader scrolled up to read history.
  const messages = channel.state.messages as Msg[];
  const last = messages[messages.length - 1];
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [last?.id, last?.updated_at, pending.length]);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickRef.current = true;
  }, [channel]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = atBottom;
    setShowJump(!atBottom);
  };

  const loadEarlier = async () => {
    const first = messages[0];
    if (!first || loadingMore) return;
    const el = listRef.current;
    const before = el?.scrollHeight || 0;
    setLoadingMore(true);
    try {
      const res = await channel.query({ messages: { limit: 30, id_lt: first.id } });
      setHasMore(res.messages.length >= 30);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } catch {
      setError('Could not load earlier messages.');
    } finally {
      setLoadingMore(false);
    }
  };

  const typers = Object.values(channel.state.typing || {})
    .filter((t: any) => t.user?.id !== me)
    .map((t: any) => t.user?.name || 'Someone');

  const uploading = pending.some((p) => p.status === 'uploading');
  const ready = pending.filter((p) => p.status === 'done');
  const canSend = !sending && !uploading && (text.trim().length > 0 || ready.length > 0);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > MAX_FILE) {
        setError(`"${file.name}" is larger than 25 MB.`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      setPending((p) => [...p, { id, name: file.name, isImage, previewUrl, size: file.size, status: 'uploading' }]);
      try {
        const res = isImage ? await channel.sendImage(file) : await channel.sendFile(file);
        setPending((p) => p.map((x) => (x.id === id ? { ...x, url: res.file, status: 'done' } : x)));
      } catch {
        setPending((p) => p.map((x) => (x.id === id ? { ...x, status: 'error' } : x)));
        setError(`"${file.name}" could not be uploaded.`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePending = (id: string) => {
    setPending((p) => {
      const item = p.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await channel.sendMessage({
        text: text.trim(),
        attachments: ready.map((p) => (p.isImage ? { type: 'image', image_url: p.url, fallback: p.name } : { type: 'file', asset_url: p.url, title: p.name, file_size: p.size })),
        ...(replyTo ? { quoted_message_id: replyTo.id } : {}),
      } as any);
      channel.stopTyping().catch(() => {});
      setText('');
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      setReplyTo(null);
      stickRef.current = true;
      areaRef.current?.focus();
    } catch {
      setError('Your message was not sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const ta = areaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    ta.style.overflowY = ta.scrollHeight > 140 ? 'auto' : 'hidden';
  }, [text]);

  const react = async (m: Msg, type: string) => {
    const mine = (m.own_reactions || []).some((r) => r.type === type);
    try {
      if (mine) await channel.deleteReaction(m.id, type);
      else await channel.sendReaction(m.id, { type });
    } catch {
      setError('Could not update your reaction.');
    }
  };

  const remove = async (m: Msg) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await client.deleteMessage(m.id);
    } catch {
      setError('That message could not be deleted.');
    }
  };

  const rows = useMemo(() => {
    const out: { msg: Msg; day: string | null; grouped: boolean }[] = [];
    let prev: Msg | null = null;
    for (const msg of messages) {
      if (msg.type === 'system') continue;
      const d = new Date(msg.created_at);
      const newDay = !prev || new Date(prev.created_at).toDateString() !== d.toDateString();
      const grouped = !!prev && !newDay && prev.user?.id === msg.user?.id && d.getTime() - new Date(prev.created_at).getTime() < 5 * 60000 && prev.type !== 'deleted' && msg.type !== 'deleted';
      out.push({ msg, day: newDay ? dayLabel(d) : null, grouped });
      prev = msg;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, messages.length, last?.updated_at]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {header}
      <div ref={listRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" role="log" aria-live="polite" aria-label="Messages">
        {hasMore && messages.length >= 25 && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={loadEarlier}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-95 disabled:opacity-60"
            >
              {loadingMore && <ButtonSpinner />}
              Load earlier messages
            </button>
          </div>
        )}
        {rows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-base font-semibold text-gray-900">No messages yet</p>
            <p className="text-sm text-gray-600">Start the conversation below.</p>
          </div>
        )}
        <ul className="space-y-0.5">
          {rows.map(({ msg, day, grouped }) => {
            const own = msg.user?.id === me;
            const role = roleLabel((msg.user as any)?.app_role);
            const deleted = msg.type === 'deleted';
            const canDelete = !deleted && (own || canModerate);
            const quoted = (msg as any).quoted_message as Msg | undefined;
            return (
              <React.Fragment key={msg.id}>
                {day && (
                  <li className="my-4 flex items-center gap-3 text-xs font-semibold text-gray-500" aria-label={day}>
                    <span className="h-px flex-1 bg-gray-200" />
                    {day}
                    <span className="h-px flex-1 bg-gray-200" />
                  </li>
                )}
                <li className={`group flex gap-2.5 ${own ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                  <div className="w-8 shrink-0">{!grouped && <Avatar name={msg.user?.name} image={msg.user?.image as string | undefined} own={own} />}</div>
                  <div className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[75%] ${own ? 'items-end' : 'items-start'}`}>
                    {!grouped && (
                      <div className={`mb-0.5 flex items-center gap-1.5 text-xs ${own ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold text-gray-900">{own ? 'You' : msg.user?.name || 'Unknown'}</span>
                        {role && <span className="rounded-md bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-800">{role}</span>}
                        <time className="text-gray-500" dateTime={new Date(msg.created_at).toISOString()}>
                          {timeOf(new Date(msg.created_at))}
                        </time>
                      </div>
                    )}
                    {deleted ? (
                      <p className="rounded-2xl border border-dashed border-gray-300 px-3 py-1.5 text-sm italic text-gray-500">This message was deleted</p>
                    ) : (
                      <div className={`min-w-0 max-w-full rounded-2xl px-3.5 py-2 text-[15px] leading-6 ${own ? 'rounded-tr-md bg-amber-600 text-white' : 'rounded-tl-md bg-gray-100 text-gray-900'}`}>
                        {quoted && !quoted.deleted_at && (
                          <div className={`mb-1.5 rounded-lg px-2.5 py-1 text-xs ${own ? 'bg-amber-700/60 text-amber-50' : 'bg-white text-gray-600'}`}>
                            <span className="font-semibold">{quoted.user?.name}</span>
                            <p className="line-clamp-2 break-words">{quoted.text || 'Attachment'}</p>
                          </div>
                        )}
                        {(msg.attachments || []).map((a: any, i: number) =>
                          a.type === 'image' && (a.image_url || a.thumb_url) ? (
                            <a key={i} href={a.image_url} target="_blank" rel="noreferrer" className="mb-1.5 block overflow-hidden rounded-xl">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.image_url || a.thumb_url} alt={a.fallback || 'Image attachment'} className="max-h-64 w-auto max-w-full object-cover" loading="lazy" />
                            </a>
                          ) : a.asset_url ? (
                            <a
                              key={i}
                              href={a.asset_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mb-1.5 flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold ${own ? 'bg-amber-700/60 text-white hover:bg-amber-700' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="min-w-0 truncate">{a.title || 'File'}</span>
                              {a.file_size ? <span className="shrink-0 text-xs font-normal opacity-80">{sizeOf(a.file_size)}</span> : null}
                            </a>
                          ) : null,
                        )}
                        {msg.text && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{msg.text}</p>}
                        {msg.status === 'sending' && <span className="text-xs opacity-80">Sending...</span>}
                        {msg.status === 'failed' && <span className="text-xs font-semibold">Not sent</span>}
                      </div>
                    )}
                    {!deleted && (msg.latest_reactions?.length || 0) > 0 && (
                      <div className="mt-1 flex gap-1">
                        {REACTIONS.map(({ type, label, Icon }) => {
                          const n = msg.reaction_groups?.[type]?.count || 0;
                          if (!n) return null;
                          const mine = (msg.own_reactions || []).some((r) => r.type === type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => react(msg, type)}
                              aria-pressed={mine}
                              aria-label={`${label}, ${n}`}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition active:scale-95 ${mine ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
                            >
                              <Icon className="h-3 w-3" aria-hidden />
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!deleted && msg.status !== 'sending' && (
                      <div className={`mt-0.5 flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${own ? 'flex-row-reverse' : ''}`}>
                        {REACTIONS.map(({ type, label, Icon }) => (
                          <button key={type} type="button" onClick={() => react(msg, type)} aria-label={label} title={label} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-90">
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(msg);
                            areaRef.current?.focus();
                          }}
                          aria-label="Reply"
                          title="Reply"
                          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-90"
                        >
                          <Reply className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => remove(msg)} aria-label="Delete message" title="Delete" className="rounded-lg p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-700 active:scale-90">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>

      <div className="relative">
        {showJump && (
          <button
            type="button"
            onClick={() => {
              const el = listRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }}
            aria-label="Jump to latest message"
            className="absolute -top-12 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-100 active:scale-95"
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="h-5 px-5 text-xs text-gray-500" aria-live="polite">
          {typers.length > 0 && `${typers.slice(0, 2).join(' and ')} ${typers.length > 1 ? 'are' : 'is'} typing...`}
        </div>
        <div className="border-t border-gray-200 bg-white px-3 pb-3 pt-2 sm:px-5">
          {error && (
            <p role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
              {error}
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-red-100">
                <X className="h-4 w-4" />
              </button>
            </p>
          )}
          {replyTo && (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
              <div className="min-w-0">
                <span className="font-semibold text-gray-900">Replying to {replyTo.user?.name}</span>
                <p className="truncate">{replyTo.text || 'Attachment'}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="rounded p-0.5 hover:bg-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {pending.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {pending.map((p) => (
                <li key={p.id} className={`flex max-w-full items-center gap-2 rounded-lg border px-2 py-1 text-xs ${p.status === 'error' ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  {p.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <span className="max-w-[160px] truncate">{p.name}</span>
                  {p.status === 'uploading' && <Spinner size="xs" />}
                  <button type="button" onClick={() => removePending(p.id)} aria-label={`Remove ${p.name}`} className="rounded p-0.5 hover:bg-gray-200">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => addFiles(e.target.files)} aria-hidden />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach a file"
              title="Attach a file"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
            >
              <Paperclip className="h-5 w-5" aria-hidden />
            </button>
            <textarea
              ref={areaRef}
              value={text}
              rows={1}
              maxLength={MAX_LEN}
              placeholder="Write a message"
              aria-label="Message"
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value) channel.keystroke().catch(() => {});
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              className="max-h-[140px] min-h-[42px] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-amber-600"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <ButtonSpinner /> : <Send className="h-4 w-4" aria-hidden />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          {text.length > MAX_LEN - 300 && <p className="mt-1 text-right text-xs text-gray-500">{MAX_LEN - text.length} characters left</p>}
        </div>
      </div>
    </div>
  );
}

/** Opens a channel by type and id, with loading and error states. */
export function useOpenChannel(client: StreamChat | null, type: string, id: string | null) {
  const [state, setState] = useState<{ channel: Channel | null; error: string | null; loading: boolean }>({ channel: null, error: null, loading: !!id });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!client || !id) return;
    let cancelled = false;
    setState({ channel: null, error: null, loading: true });
    const ch = client.channel(type, id);
    ch.watch({ messages: { limit: 30 } }).then(
      () => !cancelled && setState({ channel: ch, error: null, loading: false }),
      (e) => !cancelled && setState({ channel: null, error: e?.message || 'Could not open this conversation.', loading: false }),
    );
    return () => {
      cancelled = true;
    };
  }, [client, type, id, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
