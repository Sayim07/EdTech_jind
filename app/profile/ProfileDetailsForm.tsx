'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { CompletionRing } from '@/components/profile/CompletionRing';
import { EDUCATION_LEVELS, FIELDS, GENDERS, OCCUPATIONS, completion, type FieldErrors, type ProfileData, type ProfileKey } from '@/lib/profile';
import { refreshSessionUser } from '@/components/useSessionUser';

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const base =
  'w-full h-11 px-3.5 rounded-lg border bg-white text-gray-900 text-base placeholder-gray-500 focus:outline-none focus:shadow-[0_0_0_3px_#e3eeff] transition disabled:bg-gray-100 disabled:text-gray-500';
const ok = 'border-gray-300 focus:border-amber-600';
const bad = 'border-red-600 focus:border-red-600';

/** A labelled field. Declared outside the form so it keeps its identity (and the cursor) while the student types. */
function Field({ k, msg, children, hint, wide }: { k: ProfileKey; msg: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  const def = FIELDS.find((f) => f.key === k)!;
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`pf-${k}`} className="block text-sm font-semibold text-gray-700 mb-1">
        {def.label}
        {def.required ? <span className="text-red-700" aria-label=" required"> *</span> : <span className="font-normal text-gray-600"> (optional)</span>}
      </label>
      {children}
      {msg ? (
        <p id={`pf-${k}-msg`} role="alert" className="text-xs text-red-700 mt-1">
          {msg}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-600 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

interface Props {
  initial: ProfileData;
  /** Where to send the student after the profile becomes complete (for example the checkout they came from). */
  returnTo: string | null;
  /** The student was sent here because a purchase needs these details. */
  required: boolean;
}

export function ProfileDetailsForm({ initial, returnTo, required }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showMissing, setShowMissing] = useState(required);
  const [leaving, setLeaving] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // The percentage and the missing list follow what is SAVED, and change the moment a save succeeds.
  const c = completion({ ...saved, dob: saved.dob || null, skills: saved.skills.split(','), interests: saved.interests.split(',') } as any);
  const missingRequired = new Set(c.missingRequired.map((m) => m.key));
  const india = form.country.trim().toLowerCase() === 'india';

  useEffect(() => {
    if (required) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [required]);

  const set = (k: ProfileKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const flagged = (k: ProfileKey) => Boolean(errors[k]) || (showMissing && missingRequired.has(k) && form[k].trim() === '');
  const cls = (k: ProfileKey) => `${base} ${flagged(k) ? bad : ok}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setShowMissing(true);
    setSaving(true);
    try {
      const res = await fetch('/api/profile/details', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields || {});
        setNotice({ type: 'error', text: data.error || 'Could not save your profile.' });
        return;
      }
      setErrors({});
      setSaved(data.profile);
      setForm(data.profile);
      refreshSessionUser();
      router.refresh();
      if (data.completion.complete && returnTo) {
        setNotice({ type: 'success', text: 'Your profile is complete. Taking you back to your purchase...' });
        setLeaving(true);
        setTimeout(() => router.push(returnTo), 1200);
      } else if (data.completion.complete) {
        setNotice({ type: 'success', text: 'Your profile is complete. You can now purchase courses.' });
      } else {
        setNotice({ type: 'success', text: `Saved. Your profile is ${data.completion.percent}% complete.` });
      }
    } catch {
      setNotice({ type: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const msgFor = (k: ProfileKey) => errors[k] || (showMissing && missingRequired.has(k) && form[k].trim() === '' ? `${FIELDS.find((f) => f.key === k)!.label} is required before you can purchase.` : '');

  const inputProps = (k: ProfileKey) => ({ id: `pf-${k}`, value: form[k], onChange: set(k), disabled: saving || leaving, className: cls(k), 'aria-invalid': flagged(k) || undefined, 'aria-describedby': flagged(k) ? `pf-${k}-msg` : undefined });

  const sectionCls = 'bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-4';

  return (
    <section ref={sectionRef} id="profile-details" aria-labelledby="pd-title" className="space-y-5 scroll-mt-24">
      {/* Completion */}
      <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 ${required && !c.complete ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white'}`}>
        <CompletionRing percent={c.percent} size={84} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 id="pd-title" className="text-xl font-semibold text-gray-900">
            {c.complete ? 'Your profile is complete' : required ? 'Finish your profile to continue your purchase' : 'Complete your profile'}
          </h2>
          {c.complete ? (
            <p className="text-sm text-gray-700">All required details are saved.{c.missingOptional.length > 0 && ` Adding ${c.missingOptional.map((m) => m.label.toLowerCase()).join(', ')} would make it 100%.`}</p>
          ) : (
            <>
              <p className="text-sm text-gray-700">You need these details before you can purchase a course:</p>
              <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Missing required details">
                {c.missingRequired.map((m) => (
                  <li key={m.key}>
                    <a href={`#pf-${m.key}`} onClick={() => setShowMissing(true)} className="inline-flex items-center h-7 px-2.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <form onSubmit={save} noValidate className="space-y-5" aria-label="Profile details">
        {notice && (
          <div role={notice.type === 'success' ? 'status' : 'alert'} className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden /> : <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />}
            <span>{notice.text}</span>
          </div>
        )}

        <fieldset className={sectionCls} disabled={saving || leaving}>
          <legend className="sr-only">Personal information</legend>
          <h3 className="text-lg font-semibold text-gray-900">Personal information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field k="dob" msg={msgFor('dob')}>
              <input {...inputProps('dob')} type="date" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" />
            </Field>
            <Field k="gender" msg={msgFor('gender')}>
              <select {...inputProps('gender')} autoComplete="sex">
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field k="phone" msg={msgFor('phone')} hint="Used for payment receipts and course updates.">
              <input {...inputProps('phone')} type="tel" inputMode="tel" maxLength={16} autoComplete="tel" placeholder="10-digit mobile number" />
            </Field>
          </div>
        </fieldset>

        <fieldset className={sectionCls} disabled={saving || leaving}>
          <legend className="sr-only">Education and work</legend>
          <h3 className="text-lg font-semibold text-gray-900">Education and work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field k="education" msg={msgFor('education')}>
              <select {...inputProps('education')}>
                <option value="">Select</option>
                {EDUCATION_LEVELS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field k="occupation" msg={msgFor('occupation')}>
              <select {...inputProps('occupation')}>
                <option value="">Select</option>
                {OCCUPATIONS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field k="institution" msg={msgFor('institution')}>
              <input {...inputProps('institution')} maxLength={120} autoComplete="organization" placeholder="School, college or employer" />
            </Field>
            <Field k="qualification" msg={msgFor('qualification')}>
              <input {...inputProps('qualification')} maxLength={120} placeholder="For example: B.Sc. Food Technology" />
            </Field>
          </div>
        </fieldset>

        <fieldset className={sectionCls} disabled={saving || leaving}>
          <legend className="sr-only">Skills and interests</legend>
          <h3 className="text-lg font-semibold text-gray-900">Skills and interests</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field k="skills" msg={msgFor('skills')} hint="Separate with commas. Up to 15.">
              <input {...inputProps('skills')} maxLength={400} placeholder="Cooking, writing, research" />
            </Field>
            <Field k="interests" msg={msgFor('interests')} hint="Separate with commas. Up to 15.">
              <input {...inputProps('interests')} maxLength={400} placeholder="Food history, travel, culture" />
            </Field>
          </div>
        </fieldset>

        <fieldset className={sectionCls} disabled={saving || leaving}>
          <legend className="sr-only">Address</legend>
          <h3 className="text-lg font-semibold text-gray-900">Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field k="address" msg={msgFor('address')} wide>
              <input {...inputProps('address')} maxLength={200} autoComplete="street-address" placeholder="House number, street, area" />
            </Field>
            <Field k="city" msg={msgFor('city')}>
              <input {...inputProps('city')} maxLength={60} autoComplete="address-level2" />
            </Field>
            <Field k="state" msg={msgFor('state')}>
              {india ? (
                <select {...inputProps('state')} autoComplete="address-level1">
                  <option value="">Select state</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input {...inputProps('state')} maxLength={60} autoComplete="address-level1" />
              )}
            </Field>
            <Field k="pin" msg={msgFor('pin')}>
              <input {...inputProps('pin')} inputMode="numeric" maxLength={10} autoComplete="postal-code" />
            </Field>
            <Field k="country" msg={msgFor('country')}>
              <input {...inputProps('country')} maxLength={60} autoComplete="country-name" />
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || leaving}
            className="h-11 px-6 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
          >
            {saving ? <ButtonSpinner label="Saving..." /> : returnTo ? (<>Save and continue <ArrowRight className="w-4 h-4" aria-hidden /></>) : 'Save profile'}
          </button>
          {required && returnTo && <p className="text-sm text-gray-700">You will go straight back to your purchase.</p>}
        </div>
      </form>
    </section>
  );
}
