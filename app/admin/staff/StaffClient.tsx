'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, GraduationCap, Mail, Pencil, Phone, Plus, Search, Trash2, UserCheck, Users } from 'lucide-react';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'INSTRUCTOR' | 'STAFF';
  designation: string | null;
  bio: string | null;
  active: boolean;
}

type Filter = 'ALL' | 'INSTRUCTOR' | 'STAFF';

const TONE = {
  INSTRUCTOR: { solid: '#5b3df5', soft: '#ece8ff', label: 'Instructor' },
  STAFF: { solid: '#0ea5e9', soft: '#dff2fd', label: 'Staff' },
} as const;

const field =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60';

const blank = { name: '', email: '', phone: '', role: 'INSTRUCTOR' as StaffRow['role'], designation: '', bio: '', active: true };

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export function StaffClient({ initial }: { initial: StaffRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<StaffRow | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<StaffRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const counts = useMemo(
    () => ({
      instructors: rows.filter((r) => r.role === 'INSTRUCTOR').length,
      staff: rows.filter((r) => r.role === 'STAFF').length,
      active: rows.filter((r) => r.active).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === 'ALL' || r.role === filter) && (!q || `${r.name} ${r.email} ${r.designation || ''}`.toLowerCase().includes(q)));
  }, [rows, filter, query]);

  const sort = (list: StaffRow[]) => [...list].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  const openNew = () => {
    setForm(blank);
    setError('');
    setEditing('new');
  };
  const openEdit = (r: StaffRow) => {
    setForm({ name: r.name, email: r.email, phone: r.phone || '', role: r.role, designation: r.designation || '', bio: r.bio || '', active: r.active });
    setError('');
    setEditing(r);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        const { staff } = await call('/api/admin/staff', 'POST', form);
        setRows((cur) => sort([...cur, staff]));
        setNotice(`${staff.name} was added.`);
      } else if (editing) {
        const { staff } = await call(`/api/admin/staff/${editing.id}`, 'PATCH', form);
        setRows((cur) => sort(cur.map((r) => (r.id === staff.id ? staff : r))));
        setNotice(`${staff.name} was updated.`);
      }
      setEditing(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: StaffRow) => {
    setBusyId(r.id);
    setNotice('');
    try {
      const { staff } = await call(`/api/admin/staff/${r.id}`, 'PATCH', { active: !r.active });
      setRows((cur) => sort(cur.map((x) => (x.id === r.id ? staff : x))));
    } catch (err: any) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusyId(removing.id);
    try {
      await call(`/api/admin/staff/${removing.id}`, 'DELETE');
      setRows((cur) => cur.filter((r) => r.id !== removing.id));
      setNotice(`${removing.name} was removed.`);
      setRemoving(null);
    } catch (err: any) {
      setNotice(err.message);
      setRemoving(null);
    } finally {
      setBusyId(null);
    }
  };

  const tiles = [
    { label: 'Instructors', value: counts.instructors, icon: GraduationCap, tone: { solid: '#5b3df5', soft: '#ece8ff' } },
    { label: 'Staff members', value: counts.staff, icon: Users, tone: { solid: '#0ea5e9', soft: '#dff2fd' } },
    { label: 'Active now', value: counts.active, icon: UserCheck, tone: { solid: '#16a34a', soft: '#dbf5e5' } },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">Staff</h1>
          <p className="text-sm text-gray-600 mt-1">The instructors and team members behind CIM India.</p>
        </div>
        <button type="button" onClick={openNew} className="h-11 px-5 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm inline-flex items-center justify-center gap-2 self-start sm:self-auto transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <Plus className="w-4 h-4" aria-hidden /> Add member
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <section key={t.label} className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: t.tone.soft, color: '#1b1f3b' }} aria-label={t.label}>
            <div>
              <p className="text-4xl font-semibold leading-none tabular-nums">{t.value}</p>
              <p className="text-sm text-gray-700 mt-2">{t.label}</p>
            </div>
            <span className="w-11 h-11 rounded-full bg-white/80 flex items-center justify-center" style={{ color: t.tone.solid }}>
              <t.icon className="w-5 h-5" aria-hidden />
            </span>
          </section>
        ))}
      </div>

      {notice && (
        <p role="status" className="text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-3">
          {notice}
        </p>
      )}

      <section className="bg-white rounded-2xl border border-gray-200" aria-label="Staff directory">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200">
          <div role="group" aria-label="Filter by role" className="inline-flex p-1 rounded-full bg-gray-100 self-start">
            {([['ALL', 'Everyone'], ['INSTRUCTOR', 'Instructors'], ['STAFF', 'Staff']] as [Filter, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`h-8 px-4 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${filter === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative sm:w-72">
            <span className="sr-only">Search staff</span>
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or role" className={`${field} pl-9`} />
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-gray-900 font-semibold">{rows.length === 0 ? 'No one has been added yet' : 'No one matches this search'}</p>
            <p className="text-sm text-gray-600">{rows.length === 0 ? 'Add your first instructor or team member to get started.' : 'Try another name or switch the filter.'}</p>
            {rows.length === 0 && (
              <button type="button" onClick={openNew} className={primaryBtn}>
                <Plus className="w-4 h-4" aria-hidden /> Add member
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {visible.map((r) => {
              const tone = TONE[r.role];
              return (
                <li key={r.id} className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4 ${r.active ? '' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 xl:w-80 min-w-0">
                    <span className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold shrink-0" style={{ background: tone.soft, color: '#1b1f3b' }} aria-hidden>
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className={`font-semibold truncate ${r.active ? 'text-gray-900' : 'text-gray-600'}`}>{r.name}</p>
                      <p className="text-sm text-gray-600 truncate">{r.designation || tone.label}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-sm text-gray-700 space-y-1">
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
                      <a href={`mailto:${r.email}`} className="truncate hover:underline">{r.email}</a>
                    </p>
                    {r.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500 shrink-0" aria-hidden /> {r.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 xl:justify-end flex-wrap">
                    <span className="inline-flex items-center px-2.5 h-6 rounded-md text-xs font-semibold" style={{ background: tone.soft, color: '#1b1f3b' }}>
                      {tone.label}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.active}
                      aria-label={`${r.name} is ${r.active ? 'active' : 'inactive'}`}
                      disabled={busyId === r.id}
                      onClick={() => toggleActive(r)}
                      className="inline-flex items-center gap-2 text-sm text-gray-800 disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded-full"
                    >
                      <span className={`relative w-10 h-6 rounded-full transition-colors ${r.active ? 'bg-emerald-600' : 'bg-gray-400'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${r.active ? 'translate-x-4' : ''}`} />
                      </span>
                      {r.active ? 'Active' : 'Inactive'}
                    </button>
                    <button type="button" onClick={() => openEdit(r)} aria-label={`Edit ${r.name}`} title="Edit" className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-gray-700 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      <Pencil className="w-4 h-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setRemoving(r)} aria-label={`Remove ${r.name}`} title="Remove" className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-gray-700 hover:text-red-700 hover:bg-red-50 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editing && (
        <Dialog
          title={editing === 'new' ? 'Add a member' : 'Edit member'}
          onClose={() => !saving && setEditing(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" form="staff-form" className={primaryBtn} disabled={saving}>
                {saving ? 'Saving...' : editing === 'new' ? 'Add member' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="staff-form" onSubmit={save} className="space-y-3">
            <fieldset className="grid grid-cols-2 gap-2" disabled={saving}>
              <legend className="sr-only">Role</legend>
              {(['INSTRUCTOR', 'STAFF'] as const).map((role) => (
                <label key={role} className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition has-[:focus-visible]:shadow-[0_0_0_3px_#e3eeff] ${form.role === role ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => setForm({ ...form, role })} className="sr-only" />
                  {TONE[role].label}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Full name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Email</span>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Phone (optional)</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Designation (optional)</span>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} maxLength={80} placeholder={form.role === 'INSTRUCTOR' ? 'e.g. Culinary historian' : 'e.g. Student support lead'} className={`${field} mt-1`} disabled={saving} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Short bio (optional)</span>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} rows={3} className={`${field} mt-1 h-auto py-2`} disabled={saving} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#0056d2]" disabled={saving} />
              Active
            </label>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                {error}
              </p>
            )}
          </form>
        </Dialog>
      )}

      {removing && (
        <Dialog
          title={`Remove ${removing.name}?`}
          tone="danger"
          onClose={() => setRemoving(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} onClick={() => setRemoving(null)}>
                Keep
              </button>
              <button type="button" className="h-10 px-5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#fecaca]" onClick={confirmRemove} disabled={busyId === removing.id}>
                {busyId === removing.id ? 'Removing...' : 'Remove'}
              </button>
            </>
          }
        >
          <p>They will be taken off the staff list. This cannot be undone. To keep their record, mark them inactive instead.</p>
        </Dialog>
      )}
    </div>
  );
}
