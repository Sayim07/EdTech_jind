'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import { formatPrice } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minOrder: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  perUserLimit: number;
  active: boolean;
  courseIds: string[];
  allowedEmails: string[];
  uses: number;
  discounted: number;
}

const field =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60';

const blank = { code: '', description: '', type: 'PERCENT' as 'PERCENT' | 'FIXED', value: '', maxDiscount: '', minOrder: '', startsAt: '', expiresAt: '', maxUses: '', perUserLimit: '1', active: true, courseIds: [] as string[], emails: '' };

/** A date-time-local input wants "YYYY-MM-DDTHH:mm" in the viewer's own zone. */
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function state(c: CouponRow) {
  const now = Date.now();
  if (!c.active) return { label: 'Off', cls: 'bg-gray-200 text-gray-800' };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', cls: 'bg-amber-100 text-amber-800' };
  if (c.maxUses && c.uses >= c.maxUses) return { label: 'Used up', cls: 'bg-red-100 text-red-700' };
  return { label: 'Active', cls: 'bg-emerald-100 text-emerald-800' };
}

export function CouponsClient({ initial, courses }: { initial: CouponRow[]; courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CouponRow | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<CouponRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((c) => !q || `${c.code} ${c.description || ''}`.toLowerCase().includes(q));
  }, [initial, query]);

  const courseName = (id: string) => courses.find((c) => c.id === id)?.title || 'Deleted course';

  const open = (c: CouponRow | 'new') => {
    setEditing(c);
    setError('');
    setForm(
      c === 'new'
        ? blank
        : {
            code: c.code,
            description: c.description || '',
            type: c.type,
            value: String(c.value),
            maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
            minOrder: c.minOrder ? String(c.minOrder) : '',
            startsAt: toLocal(c.startsAt),
            expiresAt: toLocal(c.expiresAt),
            maxUses: c.maxUses ? String(c.maxUses) : '',
            perUserLimit: String(c.perUserLimit),
            active: c.active,
            courseIds: c.courseIds,
            emails: c.allowedEmails.join('\n'),
          },
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
        allowedEmails: form.emails,
      };
      if (editing === 'new') await call('/api/admin/coupons', 'POST', body);
      else await call(`/api/admin/coupons/${editing.id}`, 'PATCH', body);
      setNotice(editing === 'new' ? `Coupon ${form.code.toUpperCase()} created.` : 'Coupon saved.');
      setEditing(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: CouponRow) => {
    setBusyId(c.id);
    try {
      await call(`/api/admin/coupons/${c.id}`, 'PATCH', { active: !c.active });
      setNotice(`${c.code} is now ${c.active ? 'off' : 'on'}.`);
      router.refresh();
    } catch (err: any) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    setError('');
    try {
      await call(`/api/admin/coupons/${removing.id}`, 'DELETE');
      setNotice(`Deleted ${removing.code}.`);
      setRemoving(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const scope = (c: CouponRow) => {
    const parts = [c.courseIds.length ? (c.courseIds.length === 1 ? courseName(c.courseIds[0]) : `${c.courseIds.length} courses`) : 'All courses'];
    if (c.allowedEmails.length) parts.push(`${c.allowedEmails.length} selected student${c.allowedEmails.length === 1 ? '' : 's'}`);
    return parts.join(' · ');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search coupon codes" aria-label="Search coupons" className={`${field} pl-9`} />
        </div>
        <button type="button" onClick={() => open('new')} className="h-11 px-5 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <Plus className="w-4 h-4" aria-hidden /> Create coupon
        </button>
      </div>

      {notice && (
        <p role="status" className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">{initial.length === 0 ? 'No coupons yet' : 'No coupons match your search'}</p>
          <p className="text-sm text-gray-600 mt-1">{initial.length === 0 ? 'Create a code and share it with students. They enter it at checkout.' : 'Try a different code.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[52rem]">
            <thead className="text-gray-600 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Code</th>
                <th scope="col" className="px-5 py-3 font-semibold">Discount</th>
                <th scope="col" className="px-5 py-3 font-semibold">Applies to</th>
                <th scope="col" className="px-5 py-3 font-semibold">Used</th>
                <th scope="col" className="px-5 py-3 font-semibold">Valid until</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => {
                const st = state(c);
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-gray-900 tabular-nums tracking-wide">{c.code}</span>
                      {c.description && <span className="block text-xs text-gray-600 max-w-[14rem] truncate">{c.description}</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-900">
                      {c.type === 'PERCENT' ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                      {c.type === 'PERCENT' && c.maxDiscount ? <span className="block text-xs text-gray-600">up to {formatPrice(c.maxDiscount)}</span> : null}
                    </td>
                    <td className="px-5 py-3 text-gray-900 max-w-[14rem]"><span className="line-clamp-2">{scope(c)}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-900 tabular-nums">
                      {c.uses}
                      {c.maxUses ? ` of ${c.maxUses}` : ''}
                      <span className="block text-xs text-gray-600">{formatPrice(c.discounted)} given</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-900">{c.expiresAt ? formatDate(c.expiresAt) : 'No expiry'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 h-6 rounded-md text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => toggle(c)} disabled={busyId === c.id} className="h-9 px-3 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 text-xs font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                          {c.active ? 'Turn off' : 'Turn on'}
                        </button>
                        <button type="button" onClick={() => open(c)} aria-label={`Edit ${c.code}`} className="h-9 w-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => { setRemoving(c); setError(''); }} aria-label={`Delete ${c.code}`} className="h-9 w-9 rounded-lg border border-gray-300 text-red-700 hover:bg-red-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Dialog
          title={editing === 'new' ? 'Create coupon' : 'Edit coupon'}
          onClose={() => !saving && setEditing(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="coupon-form" className={primaryBtn} disabled={saving}>
                {saving ? 'Saving...' : editing === 'new' ? 'Create coupon' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="coupon-form" onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Code</span>
              <input required value={form.code} maxLength={30} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" className={`${field} mt-1 uppercase tracking-wide`} disabled={saving} autoComplete="off" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Description (only you see this)</span>
              <input value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>

            <fieldset className="grid grid-cols-2 gap-2" disabled={saving}>
              <legend className="sr-only">Discount type</legend>
              {(['PERCENT', 'FIXED'] as const).map((t) => (
                <label key={t} className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center cursor-pointer transition has-[:focus-visible]:shadow-[0_0_0_3px_#e3eeff] ${form.type === t ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}>
                  <input type="radio" name="coupon-type" className="sr-only" checked={form.type === t} onChange={() => setForm({ ...form, type: t })} />
                  {t === 'PERCENT' ? 'Percentage' : 'Fixed amount'}
                </label>
              ))}
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">{form.type === 'PERCENT' ? 'Percent off' : 'Rupees off'}</span>
                <input required type="number" inputMode="decimal" min="1" max={form.type === 'PERCENT' ? 100 : undefined} step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={`${field} mt-1 tabular-nums`} disabled={saving} />
              </label>
              {form.type === 'PERCENT' && (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-900">Largest discount, in rupees</span>
                  <input type="number" inputMode="decimal" min="0" step="any" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="No cap" className={`${field} mt-1 tabular-nums`} disabled={saving} />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Smallest order, in rupees</span>
                <input type="number" inputMode="decimal" min="0" step="any" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="No minimum" className={`${field} mt-1 tabular-nums`} disabled={saving} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Total uses allowed</span>
                <input type="number" inputMode="numeric" min="1" step="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className={`${field} mt-1 tabular-nums`} disabled={saving} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Uses per student</span>
                <input required type="number" inputMode="numeric" min="1" step="1" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className={`${field} mt-1 tabular-nums`} disabled={saving} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Starts</span>
                <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={`${field} mt-1`} disabled={saving} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Expires</span>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`${field} mt-1`} disabled={saving} />
              </label>
            </div>

            <fieldset className="space-y-1.5" disabled={saving}>
              <legend className="text-sm font-semibold text-gray-900">Courses this coupon works on</legend>
              <p className="text-xs text-gray-600">Tick none for every course. Tick several to make a bundle offer.</p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {courses.length === 0 && <p className="p-3 text-sm text-gray-600">No courses yet.</p>}
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.courseIds.includes(c.id)}
                      onChange={(e) => setForm({ ...form, courseIds: e.target.checked ? [...form.courseIds, c.id] : form.courseIds.filter((x) => x !== c.id) })}
                      className="w-4 h-4 accent-[#0056d2]"
                    />
                    <span className="truncate">{c.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Only these students (optional)</span>
              <textarea value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} rows={3} placeholder={'One email per line.\nLeave empty to allow every student.'} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff]" disabled={saving} />
            </label>

            <label className="flex items-center gap-2.5 text-sm font-semibold text-gray-900 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#0056d2]" disabled={saving} />
              Coupon is on
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
              </p>
            )}
          </form>
        </Dialog>
      )}

      {removing && (
        <Dialog
          title="Delete coupon"
          tone="danger"
          onClose={() => !saving && setRemoving(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} disabled={saving} onClick={() => setRemoving(null)}>
                Cancel
              </button>
              <button type="button" className={primaryBtn} disabled={saving} onClick={remove}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <p>Delete coupon {removing.code}? This cannot be undone. A coupon that students have already used cannot be deleted; turn it off instead.</p>
          {error && (
            <p role="alert" className="text-sm text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
