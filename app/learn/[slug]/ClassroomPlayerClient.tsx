'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeProvider';
import { ButtonSpinner, Spinner } from '@/components/ui/Loaders';
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  Award, 
  CheckCircle, 
  Download, 
  X,
  ExternalLink,
  Send,
  Layers,
  Headphones,
  Image as ImageIcon
} from 'lucide-react';

interface Props {
  course: any;
  user: any;
}

export function ClassroomPlayerClient({ course, user }: Props) {
  // Collect all lessons in a flat list
  const allLessons: any[] = [];
  course.modules?.forEach((mod: any) => {
    mod.lessons?.forEach((l: any) => {
      allLessons.push({ ...l, moduleTitle: mod.title });
    });
  });

  const [activeLesson, setActiveLesson] = useState<any>(allLessons[0] || null);
  const [activeTab, setActiveTab] = useState<'notes' | 'slides' | 'audio' | 'infographic' | 'assignment'>('notes');
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [mobileSyllabusOpen, setMobileSyllabusOpen] = useState(false);

  // Assignment submission state
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const toggleComplete = (id: string) => {
    if (completedLessonIds.includes(id)) {
      setCompletedLessonIds(completedLessonIds.filter((item) => item !== id));
    } else {
      setCompletedLessonIds([...completedLessonIds, id]);
    }
  };

  const handleAssignmentSubmit = async (assignmentId: string) => {
    if (!submissionText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/assignments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          content: submissionText,
        }),
      });

      if (!res.ok) throw new Error('Submission failed');
      setSubmissionSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract YouTube embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const currentAssignment = activeLesson?.assignments?.[0];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col transition-colors">
      {/* Top Classroom Bar */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-sm transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
            title="Return to Student Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="truncate">
            <span className="text-xs font-bold text-amber-700 block leading-none">
              {course.title}
            </span>
            <span className="text-sm font-sans font-bold text-gray-900 truncate block mt-0.5">
              {activeLesson?.title || 'Classroom Player'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {/* Mobile Syllabus Button */}
          <button
            onClick={() => setMobileSyllabusOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-amber-700 hover:bg-gray-200 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Syllabus</span>
          </button>

          <button
            onClick={() => activeLesson && toggleComplete(activeLesson.id)}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
              completedLessonIds.includes(activeLesson?.id)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              {completedLessonIds.includes(activeLesson?.id) ? 'Completed' : 'Mark Complete'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Video + Syllabus */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video Player Stage & Lesson Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* VIDEO PLAYER SCREEN */}
          <div className="w-full bg-black aspect-video max-h-[60vh] flex items-center justify-center relative">
            {activeLesson?.type === 'YOUTUBE' && activeLesson.videoUrl ? (
              <iframe
                src={getYouTubeEmbedUrl(activeLesson.videoUrl)}
                title={activeLesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : activeLesson?.videoUrl ? (
              <video
                key={activeLesson.videoUrl}
                src={activeLesson.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="text-base font-sans font-bold text-gray-100">
                  Slide Presentation Lesson
                </div>
                <p className="text-xs text-gray-300 max-w-sm">
                  This class is based on the presentation slides and lecture notes below.
                </p>
              </div>
            )}
          </div>

          {/* LESSON DETAILS & INTERACTION TABS */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
              <div>
                <span className="text-xs font-semibold text-amber-700">
                  {activeLesson?.moduleTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-sans font-bold text-gray-900 mt-0.5">
                  {activeLesson?.title}
                </h2>
              </div>

              {/* Lesson Action Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'notes'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Lecture Notes
                </button>
                <button
                  onClick={() => setActiveTab('slides')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'slides'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PPT Slides</span>
                </button>
                {activeLesson?.audioUrl && (
                  <button
                    onClick={() => setActiveTab('audio')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      activeTab === 'audio'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Audio Podcast</span>
                  </button>
                )}
                {activeLesson?.infographicUrl && (
                  <button
                    onClick={() => setActiveTab('infographic')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      activeTab === 'infographic'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Infographic</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('assignment')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'assignment'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Assignment</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LECTURE OVERVIEW & NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>
                  {activeLesson?.content ||
                    'Welcome to this lecture module. Watch the archival recording and take notes on the biological transformations and social structures.'}
                </p>

                {activeLesson?.fileUrl && (
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          Class Presentation Slides
                        </div>
                        <div className="text-xs text-gray-500">
                          {activeLesson.fileUrl.split('/').pop()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={activeLesson.fileUrl}
                      download
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRESENTATION SLIDES VIEWER */}
            {activeTab === 'slides' && (
              <div className="space-y-4">
                {activeLesson?.fileUrl ? (
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="font-sans font-bold text-base text-gray-900">
                          Class Slides & Presentation
                        </h4>
                        <p className="text-xs text-gray-500">
                          File: {activeLesson.fileUrl.split('/').pop()}
                        </p>
                      </div>
                      <a
                        href={activeLesson.fileUrl}
                        download
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Slides</span>
                      </a>
                    </div>

                    <div className="aspect-[16/9] bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <FileText className="w-14 h-14 text-amber-600" />
                      <div className="text-sm font-semibold text-gray-800">
                        {activeLesson.fileUrl.split('/').pop()}
                      </div>
                      <p className="text-xs text-gray-500 max-w-sm">
                        This presentation includes visual slide diagrams, primary archaeological citations, and artifact analyses used in university seminars.
                      </p>
                      <a
                        href={activeLesson.fileUrl}
                        download
                        className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:underline pt-1"
                      >
                        <span>Open & Download Slides for Offline Study</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    No presentation file attached to this specific lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUDIO PODCAST MASTERCLASS */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                {activeLesson?.audioUrl ? (
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Headphones className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-base text-gray-900">
                          Audio Lesson
                        </h4>
                        <p className="text-xs text-gray-500">
                          Listen to this audio lesson anytime on your phone or computer.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                      <audio controls src={activeLesson.audioUrl} className="w-full" />
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span>Audio Recording</span>
                        <a
                          href={activeLesson.audioUrl}
                          download
                          className="text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Audio File</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    No separate audio file for this lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB: HIGH-RESOLUTION INFOGRAPHIC */}
            {activeTab === 'infographic' && (
              <div className="space-y-4">
                {activeLesson?.infographicUrl ? (
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-base text-gray-900">
                            Visual Study Chart
                          </h4>
                          <p className="text-xs text-gray-500">
                            Visual summary and study guide
                          </p>
                        </div>
                      </div>
                      <a
                        href={activeLesson.infographicUrl}
                        download
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download High-Res</span>
                      </a>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-2">
                      <img
                        src={activeLesson.infographicUrl}
                        alt={activeLesson.title}
                        className="w-full max-h-[700px] object-contain mx-auto rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    No infographic diagram for this lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ASSIGNMENT & SUBMISSION */}
            {activeTab === 'assignment' && (
              <div className="space-y-6">
                {currentAssignment ? (
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700">
                          Homework / Assignment
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          Max Score: {currentAssignment.maxScore} pts
                        </span>
                      </div>
                      <h3 className="font-sans text-lg font-bold text-gray-900">
                        {currentAssignment.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        {currentAssignment.description}
                      </p>
                    </div>

                    {submissionSuccess ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold">Assignment Submitted Successfully!</div>
                          <div className="text-gray-600 mt-0.5">
                            Your submission has been securely delivered to the faculty queue for grading.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAssignmentSubmit(currentAssignment.id);
                        }}
                        className="space-y-3"
                      >
                        <label className="block text-xs font-semibold text-gray-700">
                          Your Research Essay or Analysis Response:
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Type your historical analysis, thesis argument, or cited findings here..."
                          className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        <button
                          type="submit"
                          disabled={submitting}
                          className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition active:scale-95 disabled:opacity-75 flex items-center gap-2 shadow-sm"
                        >
                          {submitting ? (
                            <ButtonSpinner label="Submitting..." />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit Assignment</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    No assignment required for this lesson. Proceed to the next lecture.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Desktop Fixed Syllabus Drawer */}
        <aside className="hidden lg:flex w-80 border-l border-gray-200 bg-white flex-col overflow-y-auto shrink-0 transition-colors">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-sans font-bold text-sm text-gray-900">Course Curriculum</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {allLessons.length} total lectures
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {course.modules?.map((mod: any) => (
              <div key={mod.id} className="py-2">
                <div className="px-4 py-2 text-xs font-bold text-gray-500">
                  {mod.title}
                </div>
                <div className="space-y-0.5">
                  {mod.lessons?.map((lesson: any) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isDone = completedLessonIds.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveLesson(lesson);
                          setSubmissionSuccess(false);
                          setSubmissionText('');
                        }}
                        className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between gap-2 transition ${
                          isSelected
                            ? 'bg-amber-50 text-amber-800 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <PlayCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {lesson.duration || '15m'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* MOBILE SYLLABUS BOTTOM SHEET MODAL */}
      {mobileSyllabusOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/70 flex flex-col justify-end">
          <div className="bg-white border-t border-gray-200 rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-900">Course Syllabus</h3>
                <span className="text-xs text-gray-500">Select any lecture to play</span>
              </div>
              <button
                onClick={() => setMobileSyllabusOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-2 divide-y divide-gray-100">
              {course.modules?.map((mod: any) => (
                <div key={mod.id} className="py-2">
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-500">
                    {mod.title}
                  </div>
                  {mod.lessons?.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setActiveLesson(lesson);
                        setMobileSyllabusOpen(false);
                        setSubmissionSuccess(false);
                        setSubmissionText('');
                      }}
                      className={`w-full text-left p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
                        activeLesson?.id === lesson.id
                          ? 'bg-amber-50 text-amber-800 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PlayCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {lesson.duration || '15m'}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
