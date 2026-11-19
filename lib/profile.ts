/**
 * Student profile rules, shared by the server (validation, purchase check) and the browser (form, progress bar).
 * Keep this file free of server-only imports.
 */

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;
export const EDUCATION_LEVELS = ['High school', 'Diploma', "Bachelor's degree", "Master's degree", 'Doctorate', 'Other'] as const;
export const OCCUPATIONS = ['Student', 'Working professional', 'Self-employed', 'Educator', 'Homemaker', 'Between jobs', 'Other'] as const;

export interface ProfileData {
  dob: string; // YYYY-MM-DD
  gender: string;
  phone: string;
  education: string;
  institution: string;
  qualification: string;
  skills: string; // comma separated in the form
  interests: string;
  occupation: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
}

export type ProfileKey = keyof ProfileData;

export interface FieldDef {
  key: ProfileKey;
  label: string;
  required: boolean;
  section: 'personal' | 'education' | 'skills' | 'address';
}

/** The order here is the order the form and the "missing" lists use. */
export const FIELDS: FieldDef[] = [
  { key: 'dob', label: 'Date of birth', required: true, section: 'personal' },
  { key: 'gender', label: 'Gender', required: true, section: 'personal' },
  { key: 'phone', label: 'Phone number', required: true, section: 'personal' },
  { key: 'education', label: 'Highest education', required: true, section: 'education' },
  { key: 'institution', label: 'Institution', required: false, section: 'education' },
  { key: 'qualification', label: 'Qualification or field of study', required: false, section: 'education' },
  { key: 'occupation', label: 'Occupation', required: true, section: 'education' },
  { key: 'skills', label: 'Skills', required: false, section: 'skills' },
  { key: 'interests', label: 'Interests', required: false, section: 'skills' },
  { key: 'address', label: 'Address', required: true, section: 'address' },
  { key: 'city', label: 'City', required: true, section: 'address' },
  { key: 'state', label: 'State', required: true, section: 'address' },
  { key: 'pin', label: 'PIN code', required: true, section: 'address' },
  { key: 'country', label: 'Country', required: true, section: 'address' },
];

/** What the database row looks like for the profile columns. */
export interface StoredProfile {
  dob?: Date | string | null;
  gender?: string | null;
  phone?: string | null;
  education?: string | null;
  institution?: string | null;
  qualification?: string | null;
  skills?: string[] | null;
  interests?: string[] | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  country?: string | null;
}

export const emptyProfile = (): ProfileData => ({ dob: '', gender: '', phone: '', education: '', institution: '', qualification: '', skills: '', interests: '', occupation: '', address: '', city: '', state: '', pin: '', country: 'India' });

/** Turns a stored row into the plain strings the form works with. */
export function toFormData(u: StoredProfile): ProfileData {
  const dob = u.dob ? new Date(u.dob).toISOString().slice(0, 10) : '';
  return {
    dob,
    gender: u.gender || '',
    phone: u.phone || '',
    education: u.education || '',
    institution: u.institution || '',
    qualification: u.qualification || '',
    skills: (u.skills || []).join(', '),
    interests: (u.interests || []).join(', '),
    occupation: u.occupation || '',
    address: u.address || '',
    city: u.city || '',
    state: u.state || '',
    pin: u.pin || '',
    country: u.country || '',
  };
}

export interface Completion {
  /** 0 to 100, counting every field, required or not. */
  percent: number;
  /** True when every required field is filled in. This is what allows a purchase. */
  complete: boolean;
  missingRequired: { key: ProfileKey; label: string }[];
  missingOptional: { key: ProfileKey; label: string }[];
}

export function completion(u: StoredProfile): Completion {
  const data = toFormData(u);
  const filled = (k: ProfileKey) => data[k].trim() !== '';
  const missing = FIELDS.filter((f) => !filled(f.key));
  const missingRequired = missing.filter((f) => f.required).map(({ key, label }) => ({ key, label }));
  const missingOptional = missing.filter((f) => !f.required).map(({ key, label }) => ({ key, label }));
  return { percent: Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100), complete: missingRequired.length === 0, missingRequired, missingOptional };
}

export type FieldErrors = Partial<Record<ProfileKey, string>>;

const list = (v: string) =>
  Array.from(new Set(v.split(/[,\n;]/).map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean)));

export interface CleanProfile {
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  education: string | null;
  institution: string | null;
  qualification: string | null;
  skills: string[];
  interests: string[];
  occupation: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
}

/**
 * Checks what a student typed. Fields may be left empty (they stay "missing"), but anything that IS filled in must be
 * valid. Returns clean values for the database, or one message per bad field.
 */
export function validateProfile(input: Partial<Record<ProfileKey, unknown>>): { data?: CleanProfile; errors?: FieldErrors } {
  const s = (k: ProfileKey, max: number) => (typeof input[k] === 'string' ? (input[k] as string).trim().replace(/\s+/g, ' ').slice(0, max + 1) : '');
  const errors: FieldErrors = {};
  const tooLong = (k: ProfileKey, v: string, max: number, label: string) => {
    if (v.length > max) errors[k] = `${label} must be ${max} characters or fewer.`;
  };

  // Date of birth
  const dobRaw = s('dob', 10);
  let dob: Date | null = null;
  if (dobRaw) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) ? new Date(`${dobRaw}T00:00:00Z`) : null;
    if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dobRaw) errors.dob = 'Enter a valid date of birth.';
    else {
      const now = new Date();
      let age = now.getUTCFullYear() - d.getUTCFullYear();
      if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age -= 1;
      if (d > now) errors.dob = 'Date of birth cannot be in the future.';
      else if (age < 10) errors.dob = 'You must be at least 10 years old.';
      else if (age > 100) errors.dob = 'Enter a valid date of birth.';
      else dob = d;
    }
  }

  const oneOf = (k: ProfileKey, options: readonly string[], label: string) => {
    const v = s(k, 40);
    if (v && !options.includes(v)) errors[k] = `Choose a ${label} from the list.`;
    return v && options.includes(v) ? v : '';
  };
  const gender = oneOf('gender', GENDERS, 'gender');
  const education = oneOf('education', EDUCATION_LEVELS, 'education level');
  const occupation = oneOf('occupation', OCCUPATIONS, 'occupation');

  const phone = s('phone', 20).replace(/[\s-]/g, '');
  if (phone && !/^(\+91|91|0)?[6-9]\d{9}$/.test(phone) && !/^\+\d{10,14}$/.test(phone)) errors.phone = 'Enter a valid phone number, for example 9876543210.';

  const country = s('country', 60);
  const india = country.toLowerCase() === 'india';
  const pin = s('pin', 10).replace(/\s/g, '');
  if (pin && (india ? !/^[1-9]\d{5}$/.test(pin) : pin.length < 3 || pin.length > 10)) errors.pin = india ? 'Enter a valid 6-digit PIN code.' : 'Enter a valid postal code.';

  const institution = s('institution', 120);
  const qualification = s('qualification', 120);
  const address = s('address', 200);
  const city = s('city', 60);
  const state = s('state', 60);
  tooLong('institution', institution, 120, 'Institution');
  tooLong('qualification', qualification, 120, 'Qualification');
  tooLong('address', address, 200, 'Address');
  tooLong('city', city, 60, 'City');
  tooLong('state', state, 60, 'State');
  tooLong('country', country, 60, 'Country');

  const tags = (k: 'skills' | 'interests', label: string) => {
    const raw = typeof input[k] === 'string' ? (input[k] as string).slice(0, 1000) : '';
    const items = list(raw);
    if (items.length > 15) errors[k] = `Add up to 15 ${label}.`;
    else if (items.some((x) => x.length > 40)) errors[k] = `Each of your ${label} must be 40 characters or fewer.`;
    return items.slice(0, 15).map((x) => x.slice(0, 40));
  };
  const skills = tags('skills', 'skills');
  const interests = tags('interests', 'interests');

  if (Object.keys(errors).length) return { errors };
  return {
    data: {
      dob,
      gender: gender || null,
      phone: phone || null,
      education: education || null,
      institution: institution || null,
      qualification: qualification || null,
      skills,
      interests,
      occupation: occupation || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pin: pin || null,
      country: country || null,
    },
  };
}

/** Where to send a student who must finish their profile before buying, and bring them back after. */
export function profileGateUrl(returnTo: string) {
  return `/profile?required=1&next=${encodeURIComponent(returnTo)}#profile-details`;
}
