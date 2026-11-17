'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import {
  ShieldCheck,
  BookOpen,
  Users,
  CreditCard,
  PlusCircle,
  Trash2,
  Key,
  Video,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  X,
  TrendingUp,
  AlertCircle,
  Edit3,
  Image as ImageIcon,
  Layers,
  Sparkles,
  FolderOpen,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface Props {
  adminUser: any;
  initialCourses: any[];
  initialStudents: any[];
  initialEnrollments: any[];
  totalRevenue: number;
}

export function AdminClient({
  adminUser,
  initialCourses,
  initialStudents,
  initialEnrollments,
  totalRevenue,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'courses' | 'students' | 'payments'>('analytics');
  const [courses, setCourses] = useState(initialCourses);
  const [students, setStudents] = useState(initialStudents);

  // New Course Modal Form State
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('1499');
  const [originalPrice, setOriginalPrice] = useState('2999');
  const [category, setCategory] = useState('Anthropology & Gastronomy');
  const [level, setLevel] = useState('All Levels');
  const [thumbnail, setThumbnail] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState('VIDEO');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editShortDescription, setEditShortDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password Modal State
  const [resetModalStudent, setResetModalStudent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // Upload Refs & State (Direct Gallery / Folder Picker for Images, PPTs, and Videos)
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const addPptInputRef = useRef<HTMLInputElement>(null);
  const editPptInputRef = useRef<HTMLInputElement>(null);
  const addVideoInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // Guarantee modal forms start at the very top
  useEffect(() => {
    if (showAddCourseModal) {
      const timer = setTimeout(() => {
        if (addFormRef.current) addFormRef.current.scrollTop = 0;
      }, 20);
      return () => clearTimeout(timer);
    } else if (editingCourse) {
      const timer = setTimeout(() => {
        if (editFormRef.current) editFormRef.current.scrollTop = 0;
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showAddCourseModal, editingCourse]);

  const uploadFileFromDevice = async (
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      onSuccess(data.url);
    } catch (err: any) {
      alert(err.message || 'Error uploading file from device/folder');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileFromDevice(file, setUploadingImage, onSuccess);
    e.target.value = '';
  };

  const handlePptFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileFromDevice(file, setUploadingPpt, onSuccess);
    e.target.value = '';
  };

  const handleVideoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileFromDevice(file, setUploadingVideo, onSuccess);
    e.target.value = '';
  };

  const openAddCourseModal = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setShowAddCourseModal(true);
  };

  const openEditModal = (course: any) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setEditingCourse(course);
    setEditTitle(course.title || '');
    setEditDescription(course.description || '');
    setEditShortDescription(course.shortDescription || '');
    setEditPrice(course.price !== undefined ? course.price.toString() : '0');
    setEditOriginalPrice(course.originalPrice !== undefined && course.originalPrice !== null ? course.originalPrice.toString() : '');
    setEditCategory(course.category || 'Anthropology & Gastronomy');
    setEditLevel(course.level || 'All Levels');
    setEditThumbnail(course.thumbnail || '');
    const firstLesson = course.modules?.[0]?.lessons?.[0];
    setEditVideoUrl(firstLesson?.videoUrl || '');
    setEditFileUrl(firstLesson?.fileUrl || '');
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);

    try {
      const payload = {
        title,
        description,
        shortDescription: shortDescription || description.slice(0, 120),
        price,
        originalPrice: originalPrice || null,
        category,
        level,
        thumbnail: thumbnail.trim() !== '' ? thumbnail.trim() : null,
        modules: [
          {
            title: 'Module 1: Foundations',
            lessons: lessonTitle
              ? [
                {
                  title: lessonTitle,
                  type: lessonType,
                  videoUrl: videoUrl || null,
                  fileUrl: fileUrl || null,
                  duration: '15:00',
                  content: 'Core lecture content for this module.',
                },
              ]
              : [],
          },
        ],
      };

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create course');
      }

      const { course } = await res.json();
      setCourses([course, ...courses]);
      setShowAddCourseModal(false);
      setTitle('');
      setDescription('');
      setShortDescription('');
      setPrice('1499');
      setOriginalPrice('2999');
      setThumbnail('');
      setLessonTitle('');
      setVideoUrl('');
      setFileUrl('');
      alert('Course published successfully to student catalog!');
    } catch (err: any) {
      alert(err.message || 'Error creating course');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          shortDescription: editShortDescription || null,
          price: editPrice,
          originalPrice: editOriginalPrice ? editOriginalPrice : null,
          category: editCategory,
          level: editLevel,
          thumbnail: editThumbnail.trim() !== '' ? editThumbnail.trim() : null,
          videoUrl: editVideoUrl,
          fileUrl: editFileUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update course');
      }

      const { course: updated } = await res.json();
      setCourses(courses.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCourse(null);
      alert('Course details & pricing updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Error updating course');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete course');
      setCourses(courses.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting course');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !resetModalStudent) return;
    setResetting(true);
    setResetMessage('');

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          studentId: resetModalStudent.id,
          newPassword,
        }),
      });

      if (!res.ok) throw new Error('Failed to reset password');
      setResetMessage('Password updated successfully for student!');
      setTimeout(() => {
        setResetModalStudent(null);
        setNewPassword('');
        setResetMessage('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error updating password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Title Bar */}
      <section className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
            Courses & Students
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Signed in as <span className="font-semibold">{adminUser.email}</span> (Admin)
          </p>
        </div>

        <Link
          href="/admin/courses/new"
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wide shadow-sm transition active:scale-95 flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publish New Course</span>
        </Link>
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'analytics', label: 'Summary', icon: TrendingUp },
          { id: 'courses', label: `All Courses (${courses.length})`, icon: BookOpen },
          { id: 'students', label: `Registered Students (${students.length})`, icon: Users },
          { id: 'payments', label: `Fee Payments (${initialEnrollments.length})`, icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition border-b-2 -mb-px ${active
                ? 'border-amber-600 text-amber-600 dark:text-amber-500'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === 'analytics' && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-500">Total Revenue Collected</span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                {formatPrice(totalRevenue)}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Verified payments</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-500">Active Students</span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                {students.length}
              </div>
              <span className="text-[11px] text-gray-400">Registered accounts</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-500">Masterclasses Live</span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                {courses.length}
              </div>
              <span className="text-[11px] text-gray-400">Published to catalog</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-500">Course Enrollments</span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                {initialEnrollments.length}
              </div>
              <span className="text-[11px] text-amber-600 font-medium">Classroom accesses</span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-6 rounded-2xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 space-y-3">
            <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/courses/new"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                + Create New Course
              </Link>
              <button
                onClick={() => setActiveTab('students')}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-ink-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-medium"
              >
                Reset Student Password
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-ink-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-medium"
              >
                View Fee Payments
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: COURSE MANAGER */}
      {activeTab === 'courses' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-white">
                Course Management
              </h3>
              <p className="text-xs text-gray-500">
                Create courses, set prices, upload course photos, and attach video lessons & slides.
              </p>
            </div>
            <Link
              href="/admin/courses/new"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Course</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-ink-800/30 transition"
                >
                  <div className="flex items-start gap-4">
                    {course.thumbnail ? (
                      <div className="w-16 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                        <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40 flex items-center justify-center shrink-0 text-amber-600">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">
                          {course.category} • {course.level}
                        </span>
                        {!course.thumbnail && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                            No thumbnail
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif font-bold text-sm text-gray-900 dark:text-white">
                        {course.title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {course.shortDescription || course.description}
                      </p>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span>Price: <strong className="text-amber-600 dark:text-amber-400 font-semibold">{formatPrice(course.price)}</strong></span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="line-through text-gray-400">{formatPrice(course.originalPrice)}</span>
                        )}
                        <span>•</span>
                        <span>{course.modules?.length || 0} modules</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => openEditModal(course)}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Course & Pricing</span>
                    </button>
                    <button
                      onClick={() => router.push(`/learn/${course.slug}`)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Classroom
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 transition"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <section className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-ink-800 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Student ID & Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Enrolled Courses</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-ink-800/40">
                    <td className="p-4">
                      <div className="font-bold text-gray-900 dark:text-white">{student.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{student.id}</div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{student.email}</td>
                    <td className="p-4">
                      {student.enrollments.length > 0 ? (
                        <div className="space-y-1">
                          {student.enrollments.map((en: any) => (
                            <span
                              key={en.id}
                              className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-semibold mr-1"
                            >
                              {en.course.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No courses purchased</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setResetModalStudent(student);
                          setNewPassword('');
                          setResetMessage('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-amber-600 text-gray-700 dark:text-gray-200 text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Manage Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: PAYMENT HISTORY */}
      {activeTab === 'payments' && (
        <section className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-ink-800 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Course Enrolled</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {initialEnrollments.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50/50 dark:hover:bg-ink-800/40">
                    <td className="p-4 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                      {txn.paymentId || txn.id.substring(0, 12)}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 dark:text-white">{txn.user.name}</div>
                      <div className="text-[11px] text-gray-400">{txn.user.email}</div>
                    </td>
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">
                      {txn.course.title}
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      {formatPrice(txn.amountPaid)}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                        COMPLETED
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: ADD COURSE */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-ink-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-ink-950/70">
              <div>
                <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                  Add New Masterclass Course
                </h3>
                <p className="text-xs text-gray-500">
                  Publish a new academic curriculum with lectures, PPT slide decks, and video resources.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-ink-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form ref={addFormRef} id="add-course-form" onSubmit={handleCreateCourse} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mesopotamian Cuisine & The First Written Recipes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed academic synopsis of the curriculum..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Pricing & Metadata - 2 clean rows to prevent dropdown truncation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Selling Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Original / MRP (₹) <span className="font-normal text-gray-400 text-[10px]">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="e.g. 2999"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option>All Levels</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Academic Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option>Anthropology & Gastronomy</option>
                    <option>World History</option>
                    <option>Global Economics & Culture</option>
                    <option>Engineering & Science</option>
                    <option>General Studies</option>
                  </select>
                </div>
              </div>

              {/* Thumbnail: Folder Upload + Direct Link */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-ink-800/60 border border-gray-200 dark:border-gray-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Course Thumbnail (Gallery / Folder or Direct Link)
                  </label>
                  {thumbnail && (
                    <button
                      type="button"
                      onClick={() => setThumbnail('')}
                      className="text-red-500 hover:text-red-600 text-[11px] font-medium"
                    >
                      Clear Thumbnail
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={addFileInputRef}
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e, (url) => setThumbnail(url))}
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-500 dark:hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-2 transition"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 text-amber-600" />
                        <span>Choose from Gallery / Folder</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="Or enter Image URL / path..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                  />
                </div>

                {thumbnail && (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-black/5 shrink-0">
                      <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Thumbnail active: {thumbnail.split('/').pop()}
                    </span>
                  </div>
                )}
              </div>

              {/* Lecture & Attachments: Folder Upload + Links */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-ink-800/60 border border-gray-200 dark:border-gray-700/80 space-y-3.5">
                <span className="font-bold text-gray-900 dark:text-white block text-sm">
                  First Lecture & Media Attachments:
                </span>

                <div>
                  <label className="block text-gray-600 dark:text-gray-300 mb-1 font-semibold">Lecture Title</label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="e.g. 1.1 The Royal Cuneiform Tablets"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                  />
                </div>

                {/* Video Option: Folder or Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-600 dark:text-gray-300 font-semibold">
                      Lecture Video (MP4 Folder Upload or YouTube Link)
                    </label>
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={() => setVideoUrl('')}
                        className="text-red-500 hover:text-red-600 text-[11px]"
                      >
                        Clear Video
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={addVideoInputRef}
                    accept="video/*"
                    onChange={(e) => handleVideoFileChange(e, (url) => setVideoUrl(url))}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => addVideoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Uploading Video...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5 text-amber-600" />
                          <span>Upload MP4 from Folder</span>
                        </>
                      )}
                    </button>

                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Or enter Video URL / YouTube link..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                    />
                  </div>

                  {videoUrl && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Video ready: {videoUrl.split('/').pop()}
                    </div>
                  )}
                </div>

                {/* PPT Option: Folder or Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-600 dark:text-gray-300 font-semibold">
                      Presentation Deck (PPT / PDF from Folder or Direct Path)
                    </label>
                    {fileUrl && (
                      <button
                        type="button"
                        onClick={() => setFileUrl('')}
                        className="text-red-500 hover:text-red-600 text-[11px]"
                      >
                        Clear PPT
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={addPptInputRef}
                    accept=".pptx,.ppt,.pdf"
                    onChange={(e) => handlePptFileChange(e, (url) => setFileUrl(url))}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => addPptInputRef.current?.click()}
                      disabled={uploadingPpt}
                      className="py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {uploadingPpt ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Uploading Slide Deck...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Choose PPT / PDF from Folder</span>
                        </>
                      )}
                    </button>

                    <input
                      type="text"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="Or enter PPT / PDF path (e.g. /media/deck.pptx)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                    />
                  </div>

                  {fileUrl && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Deck ready: {fileUrl.split('/').pop()}
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Pinned Footer: ALWAYS VISIBLE */}
            <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/90 dark:bg-ink-950/90 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-ink-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-course-form"
                disabled={savingCourse}
                className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingCourse ? 'Publishing Course...' : 'Publish Masterclass'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COURSE & PRICING */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-ink-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-ink-950/70">
              <div>
                <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                  Edit Masterclass & Pricing
                </h3>
                <p className="text-xs text-gray-500">
                  Update course details, adjust selling price, or modify/remove thumbnail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-ink-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form ref={editFormRef} id="edit-course-form" onSubmit={handleUpdateCourse} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Description</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Short Synopsis</label>
                <input
                  type="text"
                  value={editShortDescription}
                  onChange={(e) => setEditShortDescription(e.target.value)}
                  placeholder="One sentence summary for catalog cards..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Original / MRP (₹)</label>
                  <input
                    type="number"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    placeholder="e.g. 2999"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs"
                  >
                    <option>All Levels</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs"
                  >
                    <option>Anthropology & Gastronomy</option>
                    <option>World History</option>
                    <option>Global Economics & Culture</option>
                    <option>Engineering & Science</option>
                    <option>General Studies</option>
                  </select>
                </div>
              </div>

              {/* Thumbnail Gallery / Folder Picker */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-ink-800/60 border border-gray-200 dark:border-gray-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Course Thumbnail (Gallery / Folder or Direct Link)
                  </label>
                  {editThumbnail && (
                    <button
                      type="button"
                      onClick={() => setEditThumbnail('')}
                      className="text-red-500 hover:text-red-600 text-[11px] font-medium"
                    >
                      Remove Thumbnail
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e, (url) => setEditThumbnail(url))}
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-500 dark:hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-2 transition"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 text-amber-600" />
                        <span>Choose from Gallery / Folder</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    value={editThumbnail}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    placeholder="Or enter Image URL / path..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                  />
                </div>

                {editThumbnail ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-black/5 shrink-0">
                      <img src={editThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Live on course card: {editThumbnail.split('/').pop()}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    If left blank, the course will be displayed with a clean typography card with zero image clutter.
                  </p>
                )}
              </div>

              {/* Edit Lecture Media & Attachments (Folder Upload + Direct Link) */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-ink-800/60 border border-gray-200 dark:border-gray-700/80 space-y-3.5">
                <span className="font-bold text-gray-900 dark:text-white block text-sm">
                  Course Media & Presentation Attachments:
                </span>

                {/* Video Option: Folder or Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-600 dark:text-gray-300 font-semibold">
                      Lecture Video (MP4 Folder Upload or Direct Link)
                    </label>
                    {editVideoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditVideoUrl('')}
                        className="text-red-500 hover:text-red-600 text-[11px]"
                      >
                        Clear Video
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={editVideoInputRef}
                    accept="video/*"
                    onChange={(e) => handleVideoFileChange(e, (url) => setEditVideoUrl(url))}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => editVideoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Uploading Video...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5 text-amber-600" />
                          <span>Upload MP4 from Folder</span>
                        </>
                      )}
                    </button>

                    <input
                      type="text"
                      value={editVideoUrl}
                      onChange={(e) => setEditVideoUrl(e.target.value)}
                      placeholder="Or enter Video URL / YouTube link..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                    />
                  </div>

                  {editVideoUrl && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Video attached: {editVideoUrl.split('/').pop()}
                    </div>
                  )}
                </div>

                {/* PPT Option: Folder or Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-600 dark:text-gray-300 font-semibold">
                      Presentation Deck (PPT / PDF from Folder or Direct Path)
                    </label>
                    {editFileUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFileUrl('')}
                        className="text-red-500 hover:text-red-600 text-[11px]"
                      >
                        Clear PPT
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={editPptInputRef}
                    accept=".pptx,.ppt,.pdf"
                    onChange={(e) => handlePptFileChange(e, (url) => setEditFileUrl(url))}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => editPptInputRef.current?.click()}
                      disabled={uploadingPpt}
                      className="py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:border-amber-500 bg-white dark:bg-ink-900 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {uploadingPpt ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Uploading Slide Deck...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Choose PPT / PDF from Folder</span>
                        </>
                      )}
                    </button>

                    <input
                      type="text"
                      value={editFileUrl}
                      onChange={(e) => setEditFileUrl(e.target.value)}
                      placeholder="Or enter PPT / PDF path (e.g. /media/deck.pptx)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs"
                    />
                  </div>

                  {editFileUrl && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Deck attached: {editFileUrl.split('/').pop()}
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/90 dark:bg-ink-950/90 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-ink-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-course-form"
                disabled={savingEdit}
                className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingEdit ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET STUDENT PASSWORD */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-sm w-full p-6 space-y-4 relative">
            <button
              onClick={() => setResetModalStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Manage Student Login
              </h3>
              <p className="text-xs text-gray-500">
                Updating credentials for <span className="font-semibold text-gray-800 dark:text-gray-200">{resetModalStudent.name}</span> ({resetModalStudent.email})
              </p>
            </div>

            {resetMessage ? (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{resetMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Assign New Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. newStudentPass123"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-800 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setResetModalStudent(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50"
                  >
                    {resetting ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
