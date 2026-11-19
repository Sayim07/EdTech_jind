import type { Channel, StreamChat } from 'stream-chat';

export const isStaffUser = (client: StreamChat) => ((client.user as any)?.app_role || 'student') !== 'student';

export const channelKind = (channel: Channel): 'class' | 'ask' => ((channel.data as any)?.kind === 'ask' ? 'ask' : 'class');

/** What a conversation is called for the person looking at it. */
export function channelLabels(channel: Channel, staff: boolean) {
  const d = (channel.data || {}) as any;
  const course = d.course_title || d.name || 'Course';
  if (channelKind(channel) === 'class') return { title: course, subtitle: 'Class chat' };
  return staff ? { title: d.student_name || 'Student', subtitle: course } : { title: 'Ask the team', subtitle: course };
}

export const initials = (name?: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export const roleLabel = (role?: string) => (role === 'instructor' ? 'Instructor' : role === 'admin' ? 'Admin' : '');

export function timeLabel(d?: Date | string | null) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const diff = (now.getTime() - date.getTime()) / 86400000;
  if (diff < 7) return date.toLocaleDateString('en-IN', { weekday: 'short' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dayLabel(d: Date) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const COURSE_TYPE = 'course';
