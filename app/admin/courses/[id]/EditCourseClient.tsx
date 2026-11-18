'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeProvider';
import { 
  ArrowLeft, 
  Eye, 
  Edit3, 
  UploadCloud, 
  CheckCircle2, 
  BookOpen, 
  PlayCircle, 
  FileText, 
  Clock, 
  Compass, 
  FolderPlus, 
  Image as ImageIcon, 
  Layers,
  GraduationCap,
  DollarSign,
  Trash2,
  ExternalLink,
  Save
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { CourseDetailsFields, FaqDraft } from '@/components/admin/CourseDetailsFields';
import { parseFaqs } from '@/lib/course';
import { Spinner, ButtonSpinner } from '@/components/ui/Loaders';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Lesson {
  id: string;
  title: string;
  slug: string;
  type: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
  duration?: string | null;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CourseData {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  level: string;
  instructorName: string;
  thumbnail?: string | null;
  totalHours?: number | null;
  faqs?: string | null;
  published: boolean;
  featured: boolean;
  modules: Module[];
}

const CATEGORIES = [
  'Anthropology & Gastronomy',
  'World History',
  'Global Economics & Culture',
  'Ancient Civilizations',
  'Culinary History & Science',
];

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

export function EditCourseClient({
  adminUser,
  initialCourse,
}: {
  adminUser: AdminUser;
  initialCourse: CourseData;
}) {
  const router = useRouter();

  // Mode: 'editor' | 'preview'
  const [mainMode, setMainMode] = useState<'editor' | 'preview'>('editor');
  // Preview sub-tab: 'card' | 'page' | 'classroom'
  const [previewSubTab, setPreviewSubTab] = useState<'card' | 'page' | 'classroom'>('card');

  // Form State
  const [title, setTitle] = useState(initialCourse.title || '');
  const [shortDescription, setShortDescription] = useState(initialCourse.shortDescription || '');
  const [description, setDescription] = useState(initialCourse.description || '');
  const [price, setPrice] = useState(String(initialCourse.price ?? 0));
  const [originalPrice, setOriginalPrice] = useState(
    initialCourse.originalPrice ? String(initialCourse.originalPrice) : ''
  );
  const [category, setCategory] = useState(initialCourse.category || CATEGORIES[0]);
  const [level, setLevel] = useState(initialCourse.level || LEVELS[0]);
  const [instructorName, setInstructorName] = useState(
    initialCourse.instructorName || 'CIM India Faculty'
  );
  const [thumbnail, setThumbnail] = useState(initialCourse.thumbnail || '');
  const [published, setPublished] = useState(initialCourse.published ?? true);
  const [totalHours, setTotalHours] = useState(initialCourse.totalHours ? String(initialCourse.totalHours) : '');
  const [faqs, setFaqs] = useState<FaqDraft[]>(parseFaqs(initialCourse.faqs));

  // First Module & Lesson Details
  const firstModule = initialCourse.modules?.[0];
  const firstLesson = firstModule?.lessons?.[0];

  const [moduleTitle, setModuleTitle] = useState(
    firstModule?.title || 'Module 1: Foundations & Overview'
  );
  const [lectureTitle, setLessonTitle] = useState(
    firstLesson?.title || '1.1 Foundations & Overview'
  );
  const [lectureType, setLessonType] = useState(firstLesson?.type || 'VIDEO');
  const [videoUrl, setVideoUrl] = useState(firstLesson?.videoUrl || '');
  const [fileUrl, setFileUrl] = useState(firstLesson?.fileUrl || '');
  const [duration, setDuration] = useState(firstLesson?.duration || '45 mins');

  // Loading States
  const [savingCourse, setSavingCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // File Input References
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pptInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Upload handler to /api/upload
  const handleFileUpload = async (
    file: File,
    setLoading: (v: boolean) => void,
    onSuccess: (url: string) => void
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSuccess(data.url);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Save Course Handler
  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a course title.');
      setMainMode('editor');
      return;
    }
    if (!description.trim()) {
      alert('Please provide a course description.');
      setMainMode('editor');
      return;
    }

    setSavingCourse(true);
    setSaveSuccess(false);

    try {
      const payload: any = {
        title: title.trim(),
        shortDescription: shortDescription.trim() || null,
        description: description.trim(),
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        level,
        category,
        instructorName: instructorName.trim() || 'CIM India Faculty',
        thumbnail: thumbnail.trim() !== '' ? thumbnail.trim() : null,
        published,
        totalHours: totalHours ? parseFloat(totalHours) : null,
        faqs,
        moduleTitle: moduleTitle.trim(),
        lectureTitle: lectureTitle.trim(),
        lectureType,
        videoUrl: videoUrl.trim() || null,
        fileUrl: fileUrl.trim() || null,
        duration: duration.trim() || '30 mins',
      };

      const res = await fetch(`/api/courses/${initialCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update course');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error updating course');
    } finally {
      setSavingCourse(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    setDeletingCourse(true);
    try {
      const res = await fetch(`/api/courses/${initialCourse.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete course');
      alert('Course deleted successfully.');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting course');
    } finally {
      setDeletingCourse(false);
    }
  };

  // Pricing calculations
  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = parseFloat(originalPrice) || 0;
  const discountPercent =
    numericOriginal > numericPrice
      ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
      : null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Navigation & Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 transition"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <span>Admin Dashboard</span>
              <span>/</span>
              <span>Edit Course & Pricing</span>
            </div>
            <h1 className="text-lg sm:text-xl font-sans font-bold text-gray-900 mt-0.5 truncate max-w-md sm:max-w-xl">
              {title || 'Edit Course'}
            </h1>
          </div>
        </div>

        {/* Action Controls: Dual-Theme Toggle + Primary Mode Switcher + Save */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme Toggle */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600">
            <span className="text-xs hidden sm:inline">Theme:</span>
            <ThemeToggle />
          </div>

          {/* Clean 2-Mode Primary Switcher: Edit vs Preview */}
          <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => setMainMode('editor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mainMode === 'editor'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={() => setMainMode('preview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mainMode === 'preview'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Student Live Preview</span>
            </button>
          </div>

          {/* Save Action Button */}
          <button
            type="button"
            onClick={() => handleSaveChanges()}
            disabled={savingCourse}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm shadow-sm transition active:scale-95 disabled:opacity-75 flex items-center gap-1.5"
          >
            {savingCourse ? (
              <ButtonSpinner label="Saving..." />
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Course and pricing updated successfully! Student views are updated.</span>
          </div>
          <button
            onClick={() => setMainMode('preview')}
            className="underline font-semibold text-sm hover:text-emerald-900"
          >
            Check Live Preview
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EDITOR FORM (When mainMode === 'editor')                                */}
      {/* ========================================================================= */}
      {mainMode === 'editor' && (
        <form onSubmit={handleSaveChanges} className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Columns: Core Info & Media */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Course Identity */}
              <div className="bg-white p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <h2 className="text-sm sm:text-base font-sans font-bold text-gray-900">
                      1. Course Title & Description
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400">Required</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Ancient Civilizations & Their Food Traditions"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Short Synopsis (Shown on course cards)
                    </label>
                    <input
                      type="text"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Brief one-line summary for mobile cards"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Full Description *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed course overview and topics..."
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Lesson Media & Presentation Slides */}
              <div className="bg-white p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <h2 className="text-sm sm:text-base font-sans font-bold text-gray-900">
                      2. Video Lessons & Presentation Slides
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400">Classroom Content</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Module Name
                      </label>
                      <input
                        type="text"
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="e.g. Module 1: Foundations"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Lesson Title
                      </label>
                      <input
                        type="text"
                        value={lectureTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="e.g. 1.1 Foundations & Overview"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Lesson Type
                      </label>
                      <select
                        value={lectureType}
                        onChange={(e) => setLessonType(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="VIDEO">Video Class (MP4 or Web Link)</option>
                        <option value="PPT">Presentation Slides (PowerPoint / PDF)</option>
                        <option value="PDF">Reading Document (PDF)</option>
                        <option value="AUDIO">Audio Lesson (MP3 / Podcast)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Duration / Slide Count
                      </label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 45 mins or 24 slides"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Video Attachment */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Class Video (Upload from Computer or Web Link)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/mp4,video/webm"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, setUploadingVideo, setVideoUrl);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploadingVideo}
                        className="px-3.5 py-2 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-amber-800 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 transition"
                      >
                        {uploadingVideo ? (
                          <Spinner size="xs" variant="primary" />
                        ) : (
                          <FolderPlus className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingVideo ? 'Uploading...' : 'Upload Video'}</span>
                      </button>
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Or paste YouTube link / Video web link..."
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Presentation Deck Attachment */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Presentation Slides (PPT / PDF from Computer or Link)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="file"
                        ref={pptInputRef}
                        accept=".pptx,.ppt,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, setUploadingPpt, setFileUrl);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => pptInputRef.current?.click()}
                        disabled={uploadingPpt}
                        className="px-3.5 py-2 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-amber-800 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 transition"
                      >
                        {uploadingPpt ? (
                          <Spinner size="xs" variant="primary" />
                        ) : (
                          <FolderPlus className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingPpt ? 'Uploading...' : 'Upload Slides'}</span>
                      </button>
                      <input
                        type="text"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="Or enter Presentation / PDF link..."
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Category, Pricing & Cover Photo */}
            <div className="space-y-6">
              {/* Section 3: Category & Faculty */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm sm:text-base font-sans font-bold text-gray-900">
                    3. Course Category & Teacher
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Course Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Course Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Teacher / Faculty Name
                    </label>
                    <input
                      type="text"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                      placeholder="e.g. CIM India Faculty"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Published status toggle */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={published}
                        onChange={(e) => setPublished(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-semibold text-gray-800">
                        Published & Visible to Students
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Course Pricing */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm sm:text-base font-sans font-bold text-gray-900">
                    4. Course Pricing
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1499"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Original / MRP (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="2999"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {discountPercent !== null && discountPercent > 0 && (
                  <div className="p-2 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Students will see a {discountPercent}% discount badge!</span>
                  </div>
                )}
              </div>

              <CourseDetailsFields totalHours={totalHours} setTotalHours={setTotalHours} faqs={faqs} setFaqs={setFaqs} />

              {/* Section 5: Cover Photo */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <h2 className="text-sm sm:text-base font-sans font-bold text-gray-900">
                      5. Course Cover Photo
                    </h2>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, setUploadingImage, setThumbnail);
                    }}
                  />

                  {thumbnail ? (
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={thumbnail} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-semibold hover:bg-white"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setThumbnail('')}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-gray-300 hover:border-amber-500 bg-gray-50/50 transition flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <Spinner size="md" variant="primary" />
                          <span className="text-xs font-medium text-amber-600">Uploading image...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-gray-500 group-hover:text-amber-600">
                          <UploadCloud className="w-7 h-7 stroke-1" />
                          <div className="text-xs font-semibold">Choose Cover Photo</div>
                          <div className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</div>
                        </div>
                      )}
                    </button>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Or enter image link
                    </label>
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://... or /media/cover.jpg"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions & Delete */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMainMode('preview')}
                  className="w-full py-2.5 rounded-xl border border-amber-600/50 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Student Experience</span>
                </button>

                <button
                  type="submit"
                  disabled={savingCourse}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
                >
                  {savingCourse ? (
                    <ButtonSpinner label="Saving Changes..." />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={deletingCourse}
                  className="w-full py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-medium transition flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
                >
                  {deletingCourse ? (
                    <Spinner size="xs" variant="primary" label="Deleting..." />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Course Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 2. AUTHENTIC STUDENT LIVE PREVIEW (When mainMode === 'preview')            */}
      {/* ========================================================================= */}
      {mainMode === 'preview' && (
        <section className="space-y-6">
          {/* Preview Navigation Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-900">
                <Eye className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-semibold">Student Live Preview</h3>
              </div>
              <p className="text-xs text-amber-700">
                Exact representation of what enrolled students see across screens.
              </p>
            </div>

            {/* Sub-view selector tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 rounded-xl bg-white border border-amber-200 shadow-sm text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewSubTab('card')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    previewSubTab === 'card'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Course Card (Catalog View)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubTab('page')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    previewSubTab === 'page'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Course Details Page
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubTab('classroom')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    previewSubTab === 'classroom'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Student Learning Screen
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMainMode('editor')}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Back to Edit</span>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: CATALOG CARD PREVIEW */}
          {previewSubTab === 'card' && (
            <div className="p-8 bg-gray-100/60 rounded-2xl border border-gray-200 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-semibold text-gray-500">
                How this course appears in the student catalog
              </span>

              <div className="w-full max-w-sm">
                <article className="flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-md transition group">
                  {thumbnail ? (
                    <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden block">
                      <img
                        src={thumbnail}
                        alt={title || 'Course Preview'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-ink-950/80 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-md">
                        {level}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-700">
                        {category}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {level}
                      </span>
                    </div>
                  )}

                  <div className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 ${thumbnail ? 'pt-4' : 'pt-2'}`}>
                    <div className="space-y-1.5">
                      {thumbnail && (
                        <div className="text-xs font-semibold text-amber-700">
                          {category}
                        </div>
                      )}
                      <h3 className="font-sans text-base sm:text-lg font-bold text-gray-900 leading-snug">
                        {title || 'Untitled Course'}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {shortDescription || description || 'Course description'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1 text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          {initialCourse.modules?.length || 1} module
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {duration || '45 mins'}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-sans font-bold text-sm sm:text-base text-gray-900">
                          {numericPrice > 0 ? formatPrice(numericPrice) : 'Free'}
                        </div>
                        {numericOriginal > numericPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(numericOriginal)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: FULL DETAILS PAGE PREVIEW */}
          {previewSubTab === 'page' && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm transition-colors">
              {/* Dark Academic Hero */}
              <div className="bg-ink-950 text-white p-6 sm:p-8 border-b border-gray-800 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        {category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs font-medium">
                        {level}
                      </span>
                      <span className="text-xs text-gray-400">
                        Taught by {instructorName}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-3xl font-sans font-bold text-white tracking-tight leading-tight">
                      {title || 'Untitled Course'}
                    </h1>

                    <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
                      {shortDescription || description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-400 border-t border-gray-800/80">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-amber-400" />
                        <span>Online Course</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span>{initialCourse.modules?.length || 1} Module</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{duration || '45 mins'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Action Box */}
                  <div className="lg:col-span-4 bg-ink-900/90 rounded-2xl border border-gray-800 p-5 space-y-4 shadow-xl">
                    {thumbnail && (
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-gray-800">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-sans font-bold text-white">
                          {numericPrice > 0 ? formatPrice(numericPrice) : 'Free'}
                        </span>
                        {numericOriginal > numericPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(numericOriginal)}
                          </span>
                        )}
                      </div>
                      {discountPercent !== null && discountPercent > 0 && (
                        <span className="inline-block text-xs font-bold text-green-400 bg-green-950/60 px-2 py-0.5 rounded border border-green-800/40">
                          Save {discountPercent}% today
                        </span>
                      )}
                    </div>

                    <div className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm text-center shadow cursor-not-allowed opacity-90">
                      Enroll in Course
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Lifetime access &bull; Includes all class notes and slides
                    </p>
                  </div>
                </div>
              </div>

              {/* Syllabus Preview */}
              <div className="p-6 sm:p-8 space-y-6 max-w-4xl">
                <div className="space-y-2">
                  <h3 className="font-sans font-bold text-lg text-gray-900">
                    About This Course
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {description}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-sans font-bold text-lg text-gray-900">
                    Course Lessons
                  </h3>

                  <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
                    <div className="p-3.5 bg-gray-50 flex items-center justify-between">
                      <span className="font-sans font-bold text-xs sm:text-sm text-gray-900">
                        {moduleTitle}
                      </span>
                      <span className="text-xs text-gray-500">1 Lesson</span>
                    </div>

                    <div className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm sm:text-sm text-gray-900">
                            {lectureTitle}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>{duration || '30 mins'}</span>
                            {videoUrl && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-600 font-medium">Video Included</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 self-start sm:self-auto">
                        Sample Lesson
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: CLASSROOM PLAYER VIEW */}
          {previewSubTab === 'classroom' && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm transition-colors">
              {/* Top Classroom Bar */}
              <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="p-1 rounded-lg text-gray-400">
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-amber-700 block leading-none">
                      {category} &bull; {title}
                    </span>
                    <span className="text-xs font-sans font-bold text-gray-900 truncate block mt-0.5">
                      {lectureTitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    Mark Complete
                  </span>
                </div>
              </div>

              {/* Classroom Player Simulator */}
              <div className="flex flex-col lg:flex-row min-h-[440px]">
                {/* Left Side: Video / Slides */}
                <div className="flex-1 flex flex-col">
                  <div className="w-full bg-black aspect-video max-h-[360px] flex items-center justify-center relative">
                    {videoUrl ? (
                      <div className="text-center p-6 space-y-2 text-white">
                        <PlayCircle className="w-10 h-10 text-amber-400 mx-auto" />
                        <div className="text-xs font-semibold">{lectureTitle}</div>
                        <div className="text-xs text-gray-400 truncate max-w-sm">Attached: {videoUrl}</div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2 text-white">
                        <FileText className="w-10 h-10 text-amber-400 mx-auto" />
                        <div className="text-xs font-sans font-bold">Presentation Slides Lesson</div>
                        <p className="text-xs text-gray-400">
                          {fileUrl ? `PPT: ${fileUrl}` : 'PPT presentation or video attached'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 space-y-4 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <div>
                        <span className="text-xs font-semibold text-amber-700">
                          {moduleTitle}
                        </span>
                        <h4 className="text-sm sm:text-base font-sans font-bold text-gray-900 mt-0.5">
                          {lectureTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-md bg-amber-600 text-white shadow-sm">
                          Notes
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-gray-600">
                          Slides
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 leading-relaxed">
                      {shortDescription || description}
                    </div>

                    {fileUrl && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold text-gray-800 truncate max-w-xs">
                            {fileUrl.split('/').pop()}
                          </span>
                        </div>
                        <span className="text-xs text-amber-700 font-semibold">
                          Download PPT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Curriculum Sidebar Simulator */}
                <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white p-4 space-y-3">
                  <div className="border-b border-gray-100 pb-2">
                    <h5 className="font-sans font-bold text-xs text-gray-900">
                      Curriculum
                    </h5>
                    <span className="text-xs text-gray-400">1 Lesson in this module</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-400 block">
                      {moduleTitle}
                    </span>
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <PlayCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{lectureTitle}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{duration || '45m'}</span>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
