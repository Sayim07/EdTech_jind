import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { addMember, chatConfigured, deleteChannel, ensureChannel, queryChannels, removeMember, upsertUsers, type ChatUser } from '@/lib/chat/stream';

/**
 * Keeps Stream's channels in step with the app. The database is the source of truth: who is enrolled, and who teaches.
 *
 *  - Class chat   : one channel per course. Members: the course team + every enrolled student.
 *  - Ask the team : one private channel per student and course. Members: that student + the course team.
 *
 * The "course team" is the course's instructor (when they have a login). With no instructor, it is every admin, so a
 * student's message is never left without a reader.
 *
 * Every public function here is safe to call from payment and course code: it never throws and never waits long.
 */
export const CHANNEL_TYPE = 'course';

export const classChannelId = (courseId: string) => `c-${courseId}`;
/** Channel ids are limited to 64 characters, so the pair of ids is hashed. */
export const askChannelId = (courseId: string, studentId: string) => `ask-${createHash('sha256').update(`${courseId}:${studentId}`).digest('hex').slice(0, 32)}`;

const roleLabel = (role: string) => (role === 'ADMIN' ? 'admin' : role === 'INSTRUCTOR' ? 'instructor' : 'student');
export const toChatUser = (u: { id: string; name: string; avatarUrl?: string | null; role: string }): ChatUser => ({ id: u.id, name: u.name, image: u.avatarUrl, appRole: roleLabel(u.role) });

export interface CourseTeam {
  /** True when the course has an instructor with a login; false when the admins answer. */
  hasInstructor: boolean;
  users: ChatUser[];
}

/** Who answers messages for a course. */
export async function courseTeam(courseId: string): Promise<CourseTeam> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructor: { select: { active: true, user: { select: { id: true, name: true, avatarUrl: true, role: true } } } } },
  });
  const teacher = course?.instructor?.active ? course.instructor.user : null;
  if (teacher) return { hasInstructor: true, users: [toChatUser(teacher)] };
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, avatarUrl: true, role: true } });
  return { hasInstructor: false, users: admins.map(toChatUser) };
}

/** Wraps chat work so a Stream outage can never break a payment, an enrollment or a course edit. */
async function safely<T>(label: string, fn: () => Promise<T>, ms = 8000): Promise<T | null> {
  if (!chatConfigured()) return null;
  try {
    return await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timed out')), ms))]);
  } catch (err) {
    console.error(`Chat sync failed (${label}):`, err);
    return null;
  }
}

const COURSE_FIELDS = { id: true, title: true } as const;

async function syncClass(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: COURSE_FIELDS });
  if (!course) return deleteChannel(CHANNEL_TYPE, classChannelId(courseId));

  const [team, enrolled] = await Promise.all([
    courseTeam(courseId),
    prisma.enrollment.findMany({ where: { courseId }, select: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } }),
  ]);
  const students = enrolled.map((e) => e.user).filter((u) => u.role === 'STUDENT');
  // A class chat only exists once someone is in the class.
  if (!students.length) return deleteChannel(CHANNEL_TYPE, classChannelId(courseId));

  await upsertUsers([...team.users, ...students.map(toChatUser)]);
  await ensureChannel({
    type: CHANNEL_TYPE,
    id: classChannelId(courseId),
    name: course.title,
    members: [...team.users.map((u) => u.id), ...students.map((s) => s.id)],
    moderators: team.users.map((u) => u.id),
    createdBy: team.users[0]?.id || students[0].id,
    extra: { course_id: courseId, kind: 'class', course_title: course.title },
  });
}

/** Moves every "Ask the team" chat of a course to the current team (used when the instructor changes). */
async function syncAsk(courseId: string) {
  const [team, channels] = await Promise.all([courseTeam(courseId), queryChannels({ type: CHANNEL_TYPE, course_id: courseId, kind: 'ask' })]);
  if (!channels.length) return;
  await upsertUsers(team.users);
  for (const c of channels) {
    const student = (c.members || []).map((m) => m.user_id).find((id) => !team.users.some((t) => t.id === id));
    const members = [...team.users.map((u) => u.id), ...(student ? [student] : [])];
    await ensureChannel({ type: CHANNEL_TYPE, id: c.channel.id, name: 'Ask the team', members, moderators: team.users.map((u) => u.id), createdBy: team.users[0]?.id || members[0] });
  }
}

/** Brings the class chat and the private chats of one course fully up to date. */
export const syncCourseChat = (courseId: string) => safely('course', async () => (await syncClass(courseId), await syncAsk(courseId)));

/** A student joined a course: add them to the class chat (creating it if they are the first). */
export const studentJoined = (courseId: string, studentId: string) =>
  safely('join', async () => {
    const user = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, avatarUrl: true, role: true } });
    if (!user || user.role !== 'STUDENT') return;
    await upsertUsers([toChatUser(user)]);
    try {
      await addMember(CHANNEL_TYPE, classChannelId(courseId), studentId);
    } catch {
      await syncClass(courseId); // the channel did not exist yet
    }
  });

/** A student lost access (full refund): they leave the class chat and their private chat. */
export const studentLeft = (courseId: string, studentId: string) =>
  safely('leave', async () => {
    await removeMember(CHANNEL_TYPE, classChannelId(courseId), studentId);
    await removeMember(CHANNEL_TYPE, askChannelId(courseId, studentId), studentId);
  });

/** A course was deleted: remove its chats. */
export const courseDeleted = (courseId: string) =>
  safely('delete', async () => {
    const asks = await queryChannels({ type: CHANNEL_TYPE, course_id: courseId, kind: 'ask' });
    await Promise.all([deleteChannel(CHANNEL_TYPE, classChannelId(courseId)), ...asks.map((c) => deleteChannel(CHANNEL_TYPE, c.channel.id))]);
  });

/** Call when a staff member's login is added or removed, or their courses change: refreshes every course they teach. */
export const staffChanged = (staffId: string) =>
  safely('staff', async () => {
    const courses = await prisma.course.findMany({ where: { instructorId: staffId }, select: { id: true } });
    for (const c of courses) await Promise.all([syncClass(c.id), syncAsk(c.id)]);
  });

/** The private chat between one student and a course's team. Creates it on first use. Returns the channel id. */
export async function openAskChannel(courseId: string, studentId: string): Promise<string | null> {
  return safely('ask', async () => {
    const [course, student, team] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: COURSE_FIELDS }),
      prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, avatarUrl: true, role: true } }),
      courseTeam(courseId),
    ]);
    if (!course || !student || !team.users.length) throw new Error('Cannot open this chat');
    await upsertUsers([...team.users, toChatUser(student)]);
    const id = askChannelId(courseId, studentId);
    await ensureChannel({
      type: CHANNEL_TYPE,
      id,
      name: `Ask the team: ${course.title}`,
      members: [...team.users.map((u) => u.id), studentId],
      moderators: team.users.map((u) => u.id),
      createdBy: studentId,
      extra: { course_id: courseId, kind: 'ask', student_id: studentId, student_name: student.name, course_title: course.title },
    });
    return id;
  }).then((v) => v ?? null);
}

// Self-healing: when someone opens messaging, make sure they are in every channel they should be in. Remembered for a
// few minutes per server instance, so it costs nothing on later visits.
const healed = new Map<string, number>();
const HEAL_MS = 10 * 60_000;

export async function ensureUserChannels(user: { id: string; role: string }) {
  const hit = healed.get(user.id);
  if (hit && hit > Date.now()) return;
  if (healed.size > 2000) healed.clear();
  healed.set(user.id, Date.now() + HEAL_MS);

  let courseIds: string[] = [];
  if (user.role === 'STUDENT') {
    courseIds = (await prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } })).map((e) => e.courseId);
  } else if (user.role === 'INSTRUCTOR') {
    courseIds = (await prisma.course.findMany({ where: { instructor: { userId: user.id } }, select: { id: true } })).map((c) => c.id);
  } else if (user.role === 'ADMIN') {
    // Admins answer for every course that has no instructor with a login. Only the 10 newest are checked here, to keep
    // sign-in fast; every other course is kept up to date when students enroll or the instructor changes.
    courseIds = (await prisma.course.findMany({ where: { OR: [{ instructorId: null }, { instructor: { userId: null } }, { instructor: { active: false } }], enrollments: { some: {} } }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 10 })).map((c) => c.id);
  }
  await Promise.all(courseIds.map((id) => safely('heal', () => syncClass(id))));
}
