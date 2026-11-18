'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { CourseDetailsFields, FaqDraft } from '@/components/admin/CourseDetailsFields';
import { CategorySelect } from '@/components/admin/CategorySelect';
import { ContentBuilder } from '@/components/admin/ContentBuilder';
import { MediaField } from '@/components/admin/MediaField';
import { fieldCls } from '@/components/admin/AdminTestBuilder';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import { CourseContentDraft, validateContent } from '@/lib/course-content-shared';
import { parseFaqs } from '@/lib/course';
import { formatPrice } from '@/lib/utils';

export interface CourseBasics {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string;
  level: string;
  instructorName: string;
  thumbnail: string | null;
  totalHours: number | null;
  faqs: string | null;
  published: boolean;
}

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

interface Props {
  mode: 'create' | 'edit';
  course?: CourseBasics;
  initialContent: CourseContentDraft;
  /** Every category already used by a course, plus the defaults. */
  categories: string[];
  /** Active instructors from the Staff page, offered as suggestions for the instructor name. */
  instructors: string[];
}

export function CourseBuilder({ mode, course, initialContent, categories, instructors }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(course?.title ?? '');
  const [shortDescription, setShortDescription] = useState(course?.shortDescription ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [category, setCategory] = useState(course?.category ?? categories[0] ?? '');
  const [level, setLevel] = useState(course?.level ?? LEVELS[0]);
  const [instructorName, setInstructorName] = useState(course?.instructorName ?? 'CIM India Faculty');
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [originalPrice, setOriginalPrice] = useState(course?.originalPrice ? String(course.originalPrice) : '');
  const [thumbnail, setThumbnail] = useState(course?.thumbnail ?? '');
  const [published, setPublished] = useState(course?.published ?? true);
  const [totalHours, setTotalHours] = useState(course?.totalHours ? String(course.totalHours) : '');
  const [faqs, setFaqs] = useState<FaqDraft[]>(parseFaqs(course?.faqs));
  const [content, setContent] = useState<CourseContentDraft>(initialContent);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const snapshot = (c: CourseContentDraft) =>
    JSON.stringify([title, shortDescription, description, category, level, instructorName, price, originalPrice, thumbnail, published, totalHours, faqs, c]);
  const baseline = useRef<string>('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    baseline.current = snapshot(initialContent);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dirty = ready && snapshot(content) !== baseline.current;

  // Warn before losing unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = parseFloat(originalPrice) || 0;
  const discount = numericOriginal > numericPrice && numericOriginal > 0 ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100) : null;

  const contentProblem = useMemo(() => validateContent(content), [content]);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!title.trim()) return setError('Give the course a title.');
    if (!description.trim()) return setError('Add a course description.');
    if (!category.trim()) return setError('Choose or add a category.');
    if (contentProblem) return setError(contentProblem);

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        shortDescription: shortDescription.trim() || null,
        description: description.trim(),
        price: numericPrice,
        originalPrice: numericOriginal || null,
        level,
        category: category.trim(),
        instructorName: instructorName.trim() || 'CIM India Faculty',
        thumbnail: thumbnail.trim() || null,
        published,
        totalHours: totalHours ? parseFloat(totalHours) : null,
        faqs,
        content,
      };
      const res = await fetch(mode === 'create' ? '/api/courses' : `/api/courses/${course!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the course');

      if (mode === 'create') {
        router.push(`/admin/courses/${data.course.id}`);
        router.refresh();
        return;
      }
      // The server hands back the saved tree, so items created just now get their real ids (no duplicates on the next save).
      const saved: CourseContentDraft = data.content ?? content;
      setContent(saved);
      baseline.current = snapshot(saved);
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 4000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not save the course');
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async () => {
    if (!course) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the course');
      router.push('/admin?tab=courses');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setConfirmDelete(false);
      setDeleting(false);
    }
  };

  const card = 'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6';
  const label = 'block text-sm font-semibold text-gray-700 mb-1';

  return (
    <form onSubmit={save} className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin?tab=courses" className="w-10 h-10 shrink-0 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]" aria-label="Back to courses">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 truncate">{mode === 'create' ? 'New course' : title || 'Edit course'}</h1>
            {mode === 'edit' && course && (
              <p className="text-sm text-gray-600">
                {published ? 'Live in the catalog' : 'Hidden from the catalog'} · {numericPrice > 0 ? formatPrice(numericPrice) : 'Free'}
                {discount ? ` · ${discount}% off` : ''}
              </p>
            )}
          </div>
        </div>
        {mode === 'edit' && course && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/courses/${course.slug}`} target="_blank" className={secondaryBtn}>
              <ExternalLink className="w-4 h-4" aria-hidden /> Course page
            </Link>
            <Link href={`/learn/${course.slug}`} target="_blank" className={secondaryBtn}>
              <ExternalLink className="w-4 h-4" aria-hidden /> Open classroom
            </Link>
            <Link href={`/admin/courses/${course.id}/attempts`} className={secondaryBtn}>
              Student attempts
            </Link>
          </div>
        )}
      </header>

      {/* Basic information stays at the top, above the content builder. */}
      <section className={`${card} space-y-5`} aria-labelledby="basics">
        <h2 id="basics" className="text-xl font-semibold text-gray-900">
          Course information
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <label htmlFor="c-title" className={label}>
                Course title
              </label>
              <input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} placeholder="e.g. The Origin of Food and Human Evolution" required />
            </div>
            <div>
              <label htmlFor="c-short" className={label}>
                Short description (optional)
              </label>
              <input id="c-short" value={shortDescription} maxLength={200} onChange={(e) => setShortDescription(e.target.value)} className={fieldCls} placeholder="One line for the course card" />
            </div>
            <div>
              <label htmlFor="c-desc" className={label}>
                Description
              </label>
              <textarea id="c-desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={fieldCls} placeholder="What students will learn" required />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="c-cat" className={label}>
                Category
              </label>
              <CategorySelect id="c-cat" value={category} onChange={setCategory} options={categories} />
            </div>
            <div>
              <label htmlFor="c-level" className={label}>
                Level
              </label>
              <select id="c-level" value={level} onChange={(e) => setLevel(e.target.value)} className={fieldCls}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-inst" className={label}>
                Instructor
              </label>
              <input id="c-inst" list="c-inst-list" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className={fieldCls} autoComplete="off" />
              <datalist id="c-inst-list">
                {instructors.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {instructors.length > 0 && <p className="text-xs text-gray-600 mt-1">Pick from your Staff list or type a name.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="c-price" className={label}>
                  Price (INR)
                </label>
                <input id="c-price" type="number" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="c-orig" className={label}>
                  List price
                </label>
                <input id="c-orig" type="number" min={0} step="1" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={fieldCls} placeholder="Optional" />
              </div>
            </div>
            <MediaField label="Course photo" kind="image" value={thumbnail} onChange={setThumbnail} hint="Shown on the course card and page." />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 accent-[#0056d2]" />
              <span className="text-sm font-semibold text-gray-700">Live in the catalog</span>
            </label>
          </div>
        </div>
      </section>

      <ContentBuilder content={content} onChange={setContent} />

      <CourseDetailsFields totalHours={totalHours} setTotalHours={setTotalHours} faqs={faqs} setFaqs={setFaqs} />

      {mode === 'edit' && course && (
        <section className={`${card} flex flex-col sm:flex-row sm:items-center justify-between gap-4`} aria-labelledby="danger">
          <div>
            <h2 id="danger" className="text-lg font-semibold text-gray-900">
              Delete this course
            </h2>
            <p className="text-sm text-gray-600">Removes the course, its content, enrollments and student progress for good.</p>
          </div>
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-10 px-5 rounded-lg border border-red-700 text-red-700 hover:bg-red-50 font-semibold text-sm inline-flex items-center justify-center gap-2 transition self-start focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#fecaca]">
            <Trash2 className="w-4 h-4" aria-hidden /> Delete course
          </button>
        </section>
      )}

      {/* Save bar: always in reach while editing a long course. */}
      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 app-save-bar">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
          <p className="text-sm min-w-0 truncate" role="status" aria-live="polite">
            {error ? (
              <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> <span className="truncate">{error}</span>
              </span>
            ) : savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" aria-hidden /> Saved
              </span>
            ) : dirty ? (
              <span className="text-gray-800 font-semibold">You have unsaved changes</span>
            ) : (
              <span className="text-gray-600">{mode === 'create' ? 'Fill in the basics, then add content.' : 'All changes saved'}</span>
            )}
          </p>
          <button type="submit" disabled={saving || (mode === 'edit' && !dirty)} className={primaryBtn}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
            {saving ? 'Saving...' : mode === 'create' ? 'Create course' : 'Save changes'}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <Dialog
          title={`Delete "${title}"?`}
          tone="danger"
          onClose={() => !deleting && setConfirmDelete(false)}
          actions={
            <>
              <button type="button" className={secondaryBtn} onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Keep it
              </button>
              <button type="button" onClick={removeCourse} disabled={deleting} className="h-10 px-5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-sm transition disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#fecaca]">
                {deleting ? 'Deleting...' : 'Delete course'}
              </button>
            </>
          }
        >
          <p>This permanently removes the course, every module, lesson, assignment and test in it, plus student enrollments and progress. This cannot be undone.</p>
        </Dialog>
      )}
    </form>
  );
}
