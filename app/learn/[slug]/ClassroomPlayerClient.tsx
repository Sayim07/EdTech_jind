'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeProvider';
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  Award, 
  CheckCircle, 
  Download, 
  Menu, 
  X,
  ExternalLink,
  Send,
  Layers,
  Sparkles,
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
  course.modules.forEach((mod: any) => {
    mod.lessons.forEach((l: any) => {
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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top Classroom Bar */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            title="Return to Student Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="truncate">
            <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider block leading-none">
              {course.title}
            </span>
            <span className="text-sm font-serif font-bold text-gray-200 truncate block mt-0.5">
              {activeLesson?.title || 'Course Player'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {/* Mobile Syllabus Button */}
          <button
            onClick={() => setMobileSyllabusOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-semibold text-amber-400 hover:bg-gray-700"
          >
            <Layers className="w-4 h-4" />
            <span>Syllabus</span>
          </button>

          <button
            onClick={() => activeLesson && toggleComplete(activeLesson.id)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              completedLessonIds.includes(activeLesson?.id)
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
              <div className="text-center p-8 space-y-2">
                <FileText className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="text-sm font-serif font-bold text-gray-200">
                  Slide Seminar Lecture
                </div>
                <p className="text-xs text-gray-400">
                  This lesson focuses on the academic PPT slide deck below.
                </p>
              </div>
            )}
          </div>

          {/* LESSON DETAILS & INTERACTION TABS */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-amber-500">
                  {activeLesson?.moduleTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
                  {activeLesson?.title}
                </h2>
              </div>

              {/* Lesson Action Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-900 border border-gray-800 self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'notes'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Lecture Notes
                </button>
                <button
                  onClick={() => setActiveTab('slides')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'slides'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
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
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
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
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
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
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Assignment</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LECTURE OVERVIEW & NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                <p>
                  {activeLesson?.content ||
                    'Welcome to this lecture module. Watch the archival recording and take notes on the biological transformations and social structures.'}
                </p>

                {activeLesson?.fileUrl && (
                  <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-amber-500" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          Curriculum Presentation Deck
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {activeLesson.fileUrl.split('/').pop()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={activeLesson.fileUrl}
                      download
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
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
                  <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-serif font-bold text-base text-white">
                          Academic PowerPoint Presentation
                        </h4>
                        <p className="text-xs text-gray-400">
                          File: {activeLesson.fileUrl.split('/').pop()}
                        </p>
                      </div>
                      <a
                        href={activeLesson.fileUrl}
                        download
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download .PPTX</span>
                      </a>
                    </div>

                    <div className="aspect-[16/9] bg-gray-950 rounded-xl border border-gray-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <FileText className="w-16 h-16 text-amber-500/70" />
                      <div className="text-sm font-semibold text-gray-200">
                        {activeLesson.fileUrl.split('/').pop()}
                      </div>
                      <p className="text-xs text-gray-400 max-w-sm">
                        This presentation includes visual slide diagrams, primary archaeological citations, and artifact analyses used in university seminars.
                      </p>
                      <a
                        href={activeLesson.fileUrl}
                        download
                        className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:underline"
                      >
                        <span>Open & Download Slides for Offline Study</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-900 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                    No presentation file attached to this specific lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUDIO PODCAST MASTERCLASS */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                {activeLesson?.audioUrl ? (
                  <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Headphones className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-base text-white">
                          Audio Masterclass Podcast
                        </h4>
                        <p className="text-xs text-gray-400">
                          Listen on mobile while commuting or studying. Archival audio lecture.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                      <audio controls src={activeLesson.audioUrl} className="w-full" />
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span>Format: AAC / M4A Master Audio</span>
                        <a
                          href={activeLesson.audioUrl}
                          download
                          className="text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Audio File</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-900 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                    No separate audio file for this lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB: HIGH-RESOLUTION INFOGRAPHIC */}
            {activeTab === 'infographic' && (
              <div className="space-y-4">
                {activeLesson?.infographicUrl ? (
                  <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-base text-white">
                            Curriculum Infographic & Analytical Diagram
                          </h4>
                          <p className="text-xs text-gray-400">
                            High-resolution academic taxonomy chart
                          </p>
                        </div>
                      </div>
                      <a
                        href={activeLesson.infographicUrl}
                        download
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download High-Res</span>
                      </a>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950 p-2">
                      <img
                        src={activeLesson.infographicUrl}
                        alt={activeLesson.title}
                        className="w-full max-h-[700px] object-contain mx-auto rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-900 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                    No infographic diagram for this lesson.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ASSIGNMENT & SUBMISSION */}
            {activeTab === 'assignment' && (
              <div className="space-y-6">
                {currentAssignment ? (
                  <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                          Graded Coursework
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">
                          Max Score: {currentAssignment.maxScore} pts
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-bold text-white">
                        {currentAssignment.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        {currentAssignment.description}
                      </p>
                    </div>

                    {submissionSuccess ? (
                      <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">Assignment Submitted Successfully!</div>
                          <div className="text-gray-400 mt-0.5">
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
                        <label className="block text-xs font-semibold text-gray-300">
                          Your Research Essay or Analysis Response:
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Type your historical analysis, thesis argument, or cited findings here..."
                          className="w-full p-3.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        <button
                          type="submit"
                          disabled={submitting}
                          className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submitting ? 'Submitting...' : 'Submit Assignment to Faculty'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-900 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                    No assignment required for this lesson. Proceed to the next lecture.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Desktop Fixed Syllabus Drawer */}
        <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-gray-900 flex-col overflow-y-auto shrink-0">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-serif font-bold text-sm text-white">Course Curriculum</h3>
            <div className="text-xs text-gray-400 mt-1">
              {allLessons.length} total lectures
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {course.modules.map((mod: any, mIdx: number) => (
              <div key={mod.id} className="py-2">
                <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {mod.title}
                </div>
                <div className="space-y-0.5">
                  {mod.lessons.map((lesson: any) => {
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
                            ? 'bg-amber-950/60 text-amber-300 font-semibold border-l-2 border-amber-500'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <PlayCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
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
        <div className="fixed inset-0 z-50 lg:hidden bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-gray-900 border-t border-gray-800 rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm text-white">Course Syllabus</h3>
                <span className="text-[11px] text-gray-400">Select any lecture to play</span>
              </div>
              <button
                onClick={() => setMobileSyllabusOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-2 divide-y divide-gray-800">
              {course.modules.map((mod: any) => (
                <div key={mod.id} className="py-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {mod.title}
                  </div>
                  {mod.lessons.map((lesson: any) => (
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
                          ? 'bg-amber-950 text-amber-300 font-semibold'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PlayCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
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
