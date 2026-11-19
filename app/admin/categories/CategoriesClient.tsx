'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  courses: number;
}

const field =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60';

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

const byName = (a: CategoryRow, b: CategoryRow) => a.name.localeCompare(b.name);

export function CategoriesClient({ initial }: { initial: CategoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<CategoryRow | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [notice, setNotice] = useState('');

  const open = (c: CategoryRow | 'new') => {
    setEditing(c);
    setName(c === 'new' ? '' : c.name);
    setDescription(c === 'new' ? '' : c.description || '');
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        const { category } = await call('/api/admin/categories', 'POST', { name, description });
        setRows((r) => [...r, { ...category, courses: 0 }].sort(byName));
        setNotice(`Added "${category.name}".`);
      } else {
        const { category } = await call(`/api/admin/categories/${editing.id}`, 'PATCH', { name, description });
        setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, name: category.name, description: category.description } : x)).sort(byName));
        setNotice(`Saved "${category.name}".`);
      }
      setEditing(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    setError('');
    try {
      await call(`/api/admin/categories/${removing.id}`, 'DELETE');
      setRows((r) => r.filter((x) => x.id !== removing.id));
      setNotice(`Deleted "${removing.name}".`);
      setRemoving(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const errorLine = error && (
    <p role="alert" className="text-sm text-red-700 flex items-center gap-1.5">
      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> {error}
    </p>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link href="/admin?tab=courses" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Back to courses
      </Link>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-prose">Group your courses. A category appears in the course form and in the catalog filters as soon as you add it.</p>
        </div>
        <button type="button" onClick={() => open('new')} className="h-11 px-5 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm inline-flex items-center justify-center gap-2 self-start transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <Plus className="w-4 h-4" aria-hidden /> Create category
        </button>
      </header>

      {notice && (
        <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">No categories yet</p>
          <p className="text-sm text-gray-600 mt-1">Create your first category, then choose it when you add a course.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-600 truncate">
                  {c.courses} course{c.courses === 1 ? '' : 's'}
                  {c.description ? ` · ${c.description}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => open(c)} aria-label={`Edit ${c.name}`} className="h-9 w-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoving(c);
                  setError('');
                }}
                aria-label={`Delete ${c.name}`}
                className="h-9 w-9 rounded-lg border border-gray-300 text-red-700 hover:bg-red-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Dialog
          title={editing === 'new' ? 'Create category' : 'Edit category'}
          onClose={() => !saving && setEditing(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="category-form" className={primaryBtn} disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : editing === 'new' ? 'Create category' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="category-form" onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Name</span>
              <input autoFocus required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-900">Description (optional)</span>
              <input maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} mt-1`} disabled={saving} autoComplete="off" />
            </label>
            {errorLine}
          </form>
        </Dialog>
      )}

      {removing && (
        <Dialog
          title="Delete category"
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
          <p>Delete &quot;{removing.name}&quot;? This cannot be undone.</p>
          {errorLine}
        </Dialog>
      )}
    </div>
  );
}
