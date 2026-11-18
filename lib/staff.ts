export const STAFF_ROLES = ['INSTRUCTOR', 'STAFF'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffInput {
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  designation: string | null;
  bio: string | null;
  active: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Validates a create/edit payload. Returns either the cleaned data or a message the form can show. */
export function parseStaffInput(raw: any, partial = false): { data?: Partial<StaffInput>; error?: string } {
  const out: Partial<StaffInput> = {};

  if (!partial || raw.name !== undefined) {
    const name = clean(raw.name);
    if (name.length < 2 || name.length > 80) return { error: 'Name must be 2 to 80 characters.' };
    out.name = name;
  }
  if (!partial || raw.email !== undefined) {
    const email = clean(raw.email).toLowerCase();
    if (!EMAIL.test(email) || email.length > 120) return { error: 'Enter a valid email address.' };
    out.email = email;
  }
  if (!partial || raw.role !== undefined) {
    if (!STAFF_ROLES.includes(raw.role)) return { error: 'Choose Instructor or Staff.' };
    out.role = raw.role;
  }
  if (raw.phone !== undefined) {
    const phone = clean(raw.phone);
    if (phone && !/^[+\d][\d\s()-]{6,18}$/.test(phone)) return { error: 'Enter a valid phone number or leave it blank.' };
    out.phone = phone || null;
  }
  if (raw.designation !== undefined) {
    const d = clean(raw.designation);
    if (d.length > 80) return { error: 'Designation must be 80 characters or fewer.' };
    out.designation = d || null;
  }
  if (raw.bio !== undefined) {
    const b = clean(raw.bio);
    if (b.length > 600) return { error: 'Bio must be 600 characters or fewer.' };
    out.bio = b || null;
  }
  if (raw.active !== undefined) out.active = Boolean(raw.active);
  return { data: out };
}
