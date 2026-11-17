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
  ExternalLink,
  DollarSign,
  Headphones,
  CheckCircle,
  Download,
  Award
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const CATEGORIES = [
  'Anthropology & Gastronomy',
  'World History',
  'Global Economics & Culture',
  'Ancient Civilizations',
  'Culinary History & Science'
];

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

export function CreateCourseClient({ adminUser }: { adminUser: AdminUser }) {
  const router = useRouter();

  // Primary Mode: 'editor' | 'preview'
  const [mainMode, setMainMode] = useState<'editor' | 'preview'>('editor');

  // Preview Sub-Tab: 'card' (chhota preview) | 'page' (full page landing preview) | 'classroom' (classroom player view)
  const [previewSubTab, setPreviewSubTab] = useState<'card' | 'page' | 'classroom'>('card');

  // Form State
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1499');
  const [originalPrice, setOriginalPrice] = useState('2999');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [instructorName, setInstructorName] = useState('Prof. C.I.M. Jindal');
  const [thumbnail, setThumbnail] = useState('');

  // First Module & Lecture Details
  const [moduleTitle, setModuleTitle] = useState('Module 1: Foundations & Archeology');
  const [lectureTitle, setLessonTitle] = useState('1.1 The Royal Cuneiform Tablets & Feasting');
  const [lectureType, setLessonType] = useState('VIDEO');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [duration, setDuration] = useState('45 mins');

  // Loading States
  const [savingCourse, setSavingCourse] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

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

  // Publish Form Handler
  const handlePublishCourse = async (e?: React.FormEvent) => {
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
    try {
      const payload: any = {
        title: title.trim(),
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim(),
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        level,
        category,
        thumbnail: thumbnail.trim() !== '' ? thumbnail.trim() : null,
      };

      if (moduleTitle.trim() && lectureTitle.trim()) {
        payload.modules = [
          {
            title: moduleTitle.trim(),
            lessons: [
              {
                title: lectureTitle.trim(),
                type: lectureType,
                videoUrl: videoUrl.trim() || null,
                fileUrl: fileUrl.trim() || null,
                duration: duration.trim() || '30 mins',
                content: shortDescription || description,
              },
            ],
          },
        ];
      }

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish course');
      }

      alert('Masterclass course published successfully to student catalog!');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error publishing course');
    } finally {
      setSavingCourse(false);
    }
  };

  // Pricing & Discount Calculations
  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = parseFloat(originalPrice) || 0;
  const discountPercent =
    numericOriginal > numericPrice
      ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation & Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-ink-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-ink-800 text-gray-700 dark:text-gray-300 transition"
            title="Back to Admin Studio"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
              <span>Admin Studio</span>
              <span>/</span>
              <span>Publish Course</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white mt-0.5">
              {title ? title : 'New Masterclass Publication'}
            </h1>
          </div>
        </div>

        {/* Action Controls: Dual-Theme Toggle + Primary Mode Switcher + Publish */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Theme Toggle (Test in Light & Dark Mode) */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-gray-100 dark:bg-ink-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
            <span className="text-[11px] hidden sm:inline">Theme:</span>
            <ThemeToggle />
          </div>

          {/* Clean 2-Mode Primary Switcher: Edit vs Preview */}
          <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-ink-800 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setMainMode('editor')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                mainMode === 'editor'
                  ? 'bg-white dark:bg-ink-900 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={() => setMainMode('preview')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                mainMode === 'preview'
                  ? 'bg-white dark:bg-ink-900 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Student Live Preview</span>
            </button>
          </div>

          {/* Publish Action Button */}
          <button
            type="button"
            onClick={() => handlePublishCourse()}
            disabled={savingCourse}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {savingCourse ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{savingCourse ? 'Publishing...' : 'Publish Masterclass'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EDITOR FORM (When mainMode === 'editor')                                */}
      {/* ========================================================================= */}
      {mainMode === 'editor' && (
        <form onSubmit={handlePublishCourse} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Core Information & Curriculum Attachments */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Course Identity */}
              <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <h2 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                      1. Course Title & Syllabus Overview
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400">Required</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Ancient Civilizations & Their Food Traditions"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Short Synopsis / Subtitle (Shown on catalog card)
                    </label>
                    <input
                      type="text"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="e.g. From Roman power banquets and Egyptian beer pyramids to Mesopotamian royal tablets."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Comprehensive Description *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed academic synopsis, historical context, key learning outcomes, and archival bibliography..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Curriculum & Initial Media Attachments */}
              <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <h2 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                      2. Curriculum & Lecture Media (Folder Upload & Direct Link)
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400">Classroom Content</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Module Name
                      </label>
                      <input
                        type="text"
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="e.g. Module 1: Mesopotamian Cuisine"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Lecture Title
                      </label>
                      <input
                        type="text"
                        value={lectureTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="e.g. 1.1 Tasting Ancient Mesopotamia: Table of Gods"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Lesson Type
                      </label>
                      <select
                        value={lectureType}
                        onChange={(e) => setLessonType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="VIDEO">Video Class (MP4 or YouTube)</option>
                        <option value="PPT">Presentation Slides (PowerPoint / PDF)</option>
                        <option value="PDF">Reading Document (PDF)</option>
                        <option value="AUDIO">Audio Lesson (MP3 / Audio)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Duration / Slide Count
                      </label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 45 mins or 24 slides"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Video Attachment */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
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
                        className="px-4 py-2.5 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-2 shrink-0 transition"
                      >
                        {uploadingVideo ? (
                          <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FolderPlus className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video from Computer'}</span>
                      </button>
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Or paste YouTube link / Video web link..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Presentation Deck Attachment */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
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
                        className="px-4 py-2.5 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-2 shrink-0 transition"
                      >
                        {uploadingPpt ? (
                          <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FolderPlus className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingPpt ? 'Uploading Slides...' : 'Upload Slides from Computer'}</span>
                      </button>
                      <input
                        type="text"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="Or enter Presentation / PDF link..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Taxonomy, Pricing & Visual Thumbnail */}
            <div className="space-y-6">
              {/* Section 3: Taxonomy & Instructor */}
              <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <h2 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                    3. Course Category & Teacher
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Course Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Course Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Teacher / Instructor Name
                    </label>
                    <input
                      type="text"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                      placeholder="e.g. Prof. C.I.M. Jindal"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Pricing & Fees */}
              <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <h2 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                    4. Course Fees & Pricing
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1499"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Original / MRP (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="2999"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {discountPercent !== null && discountPercent > 0 && (
                  <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-[11px] font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Students will see a {discountPercent}% discount badge!</span>
                  </div>
                )}
              </div>

              {/* Section 5: Thumbnail Image Upload & URL */}
              <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <h2 className="text-base font-serif font-bold text-gray-900 dark:text-white">
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

                  {/* Thumbnail Preview or Upload Button */}
                  {thumbnail ? (
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={thumbnail} alt="Cover preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-ink-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
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
                      className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 bg-gray-50/50 dark:bg-ink-800/40 transition flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2 text-amber-600">
                          <span className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium">Uploading image...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                          <UploadCloud className="w-8 h-8 stroke-1" />
                          <div className="text-xs font-semibold">
                            Click to choose Course Photo from your Computer
                          </div>
                          <div className="text-[11px] text-gray-400">
                            PNG, JPG, WEBP up to 10MB
                          </div>
                        </div>
                      )}
                    </button>
                  )}

                  {/* Direct Image URL input */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Or paste Image web link
                    </label>
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://... or /media/cover.jpg"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-ink-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 italic">
                    If you don&apos;t upload a photo, a clean title card will be used automatically.
                  </p>
                </div>
              </div>

              {/* Action Button to switch to Preview */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMainMode('preview')}
                  className="w-full py-3 rounded-xl border border-amber-600/50 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview How Students See This Course</span>
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCourse ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{savingCourse ? 'Publishing...' : 'Publish Course Now'}</span>
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
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <Eye className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-semibold">Student Live Preview</h3>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Check how your course looks to students on computer and mobile.
              </p>
            </div>

            {/* Sub-view selector tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 rounded-xl bg-white dark:bg-ink-900 border border-amber-200 dark:border-gray-800 shadow-sm text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewSubTab('card')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    previewSubTab === 'card'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Student Learning Screen
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMainMode('editor')}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Back to Edit</span>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: CHHOTA PREVIEW (STUDENT CATALOG CARD) */}
          {previewSubTab === 'card' && (
            <div className="p-8 bg-gray-100/60 dark:bg-ink-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center space-y-6">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                How this course looks in the course catalog
              </span>

              <div className="w-full max-w-sm">
                <article className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-md transition group">
                  {/* Thumbnail (if set) */}
                  {thumbnail ? (
                    <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800 overflow-hidden block">
                      <img
                        src={thumbnail}
                        alt={title || 'Course Preview'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-ink-950/80 backdrop-blur-sm text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        {level}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 pb-0 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {category}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {level}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className={`p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 ${thumbnail ? 'pt-5' : 'pt-3'}`}>
                    <div className="space-y-2">
                      {thumbnail && (
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {category}
                        </div>
                      )}
                      <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white leading-snug">
                        {title || 'Untitled Masterclass Course'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {shortDescription || description || 'Detailed historical synopsis and primary archaeological curriculum.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          1 module
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {duration || '45 mins'}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-serif font-bold text-base text-gray-900 dark:text-white">
                          {formatPrice(numericPrice)}
                        </div>
                        {numericOriginal > numericPrice && (
                          <span className="text-[11px] text-gray-400 line-through">
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

          {/* SUB-VIEW 2: FULL PAGE PREVIEW (COURSE LANDING VIEW) */}
          {previewSubTab === 'page' && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-ink-900 shadow-sm transition-colors">
              {/* Dark Academic Hero Banner */}
              <div className="bg-ink-950 text-white p-6 sm:p-10 border-b border-gray-800 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                        {category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-gray-800 text-gray-300 text-xs font-medium">
                        {level}
                      </span>
                      <span className="text-xs text-gray-400">
                        Taught by {instructorName}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
                      {title || 'Untitled Masterclass Course'}
                    </h1>

                    <p className="text-sm sm:text-base text-gray-300 max-w-3xl leading-relaxed">
                      {shortDescription || description || 'Detailed academic curriculum...'}
                    </p>

                    <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-gray-400 border-t border-gray-800/80">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-amber-400" />
                        <span>Online Course</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span>1 Module &bull; 1 Class Lesson</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{duration || '45 mins'} Estimated</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Hero Card: Enrollment CTA */}
                  <div className="lg:col-span-4 bg-ink-900/90 rounded-2xl border border-gray-800 p-6 space-y-5 shadow-2xl backdrop-blur-sm">
                    {thumbnail && (
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-gray-800">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-serif font-bold text-white">
                          {formatPrice(numericPrice)}
                        </span>
                        {numericOriginal > numericPrice && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(numericOriginal)}
                          </span>
                        )}
                      </div>
                      {discountPercent !== null && discountPercent > 0 && (
                        <span className="inline-block text-[11px] font-bold text-green-400 bg-green-950/60 px-2 py-0.5 rounded border border-green-800/40">
                          Save {discountPercent}% today
                        </span>
                      )}
                    </div>

                    <div className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold text-xs text-center shadow cursor-not-allowed opacity-90">
                      Enroll in Course
                    </div>
                    <p className="text-[11px] text-gray-400 text-center">
                      Instant lifetime access &bull; Includes all class notes and slides
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Syllabus & Attached Resources Preview */}
              <div className="p-6 sm:p-10 space-y-8 max-w-4xl">
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-xl text-gray-900 dark:text-white">
                    About This Course
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {description || 'Comprehensive course syllabus will be rendered here.'}
                  </div>
                </div>

                {/* Syllabus Module Accordion */}
                <div className="space-y-4">
                  <h3 className="font-serif font-bold text-xl text-gray-900 dark:text-white">
                    Course Lessons & Study Material
                  </h3>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
                    <div className="p-4 bg-gray-50 dark:bg-ink-800/60 flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-gray-900 dark:text-white">
                        {moduleTitle || 'Module 1'}
                      </span>
                      <span className="text-xs text-gray-500">1 Class</span>
                    </div>

                    <div className="p-4 bg-white dark:bg-ink-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {lectureType === 'PPT' || lectureType === 'PDF' ? (
                          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                        ) : (
                          <PlayCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {lectureTitle || '1.1 Tasting Ancient Mesopotamia: Table of Gods'}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>{lectureType}</span>
                            <span>&bull;</span>
                            <span>{duration || '45 mins'}</span>
                            {fileUrl && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium">Class Slides Attached</span>
                              </>
                            )}
                            {videoUrl && (
                              <>
                                <span>&bull;</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">Class Video Attached</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-ink-800 text-gray-600 dark:text-gray-300 self-start sm:self-auto">
                        Sample Lesson
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: CLASSROOM PLAYER VIEW (EXACTLY MATCHING /learn/[slug]) */}
          {previewSubTab === 'classroom' && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-ink-950 shadow-sm transition-colors">
              {/* Top Classroom Bar */}
              <div className="h-14 bg-white dark:bg-ink-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white">
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block leading-none">
                      {category} &bull; {title || 'Course Player'}
                    </span>
                    <span className="text-xs font-serif font-bold text-gray-900 dark:text-gray-100 truncate block mt-0.5">
                      {lectureTitle || '1.1 Tasting Ancient Mesopotamia: Table of Gods'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-ink-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    Mark Complete
                  </span>
                </div>
              </div>

              {/* Classroom Player Simulator */}
              <div className="flex flex-col lg:flex-row min-h-[480px]">
                {/* Left Side: Video Screen & Lecture Details */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Video Stage */}
                  <div className="w-full bg-black aspect-video max-h-[380px] flex items-center justify-center relative">
                    {videoUrl ? (
                      <div className="text-center p-6 space-y-2 text-white">
                        <PlayCircle className="w-12 h-12 text-amber-400 mx-auto" />
                        <div className="text-xs font-semibold">{lectureTitle}</div>
                        <div className="text-[11px] text-gray-400">Attached: {videoUrl}</div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2 text-white">
                        <FileText className="w-12 h-12 text-amber-400 mx-auto" />
                        <div className="text-sm font-serif font-bold">Slide Seminar Lecture</div>
                        <p className="text-xs text-gray-400">
                          {fileUrl ? `PPT Attached: ${fileUrl}` : 'PPT presentation or video attached'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lecture Details and Tabs */}
                  <div className="p-6 space-y-5 bg-white dark:bg-ink-900 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                      <div>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {moduleTitle}
                        </span>
                        <h4 className="text-lg font-serif font-bold text-gray-900 dark:text-white mt-0.5">
                          {lectureTitle}
                        </h4>
                      </div>

                      {/* Interactive Tabs */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-ink-800 text-xs font-semibold">
                        <span className="px-3 py-1 rounded-lg bg-amber-600 text-white shadow-sm">
                          Lecture Notes
                        </span>
                        <span className="px-3 py-1 rounded-lg text-gray-600 dark:text-gray-400">
                          PPT Slides
                        </span>
                        <span className="px-3 py-1 rounded-lg text-gray-600 dark:text-gray-400">
                          Assignment
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {shortDescription || description || 'Lecture description and archival citations will be displayed here.'}
                    </div>

                    {fileUrl && (
                      <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-ink-950 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {fileUrl.split('/').pop()}
                          </span>
                        </div>
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                          Download PPT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Curriculum Sidebar Simulator */}
                <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-ink-900 p-4 space-y-3">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h5 className="font-serif font-bold text-xs text-gray-900 dark:text-white">
                      Course Curriculum
                    </h5>
                    <span className="text-[11px] text-gray-400">1 Lecture attached</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {moduleTitle}
                    </span>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-l-2 border-amber-600 text-xs font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <PlayCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{lectureTitle}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{duration || '45m'}</span>
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
