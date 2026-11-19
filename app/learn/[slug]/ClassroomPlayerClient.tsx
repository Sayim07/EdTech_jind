'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  Image as ImageIcon,
  Award as AwardIcon,
  ClipboardCheck,
  PencilLine,
} from 'lucide-react';

interface Props {
  course: any;
  user: any;
  initialCompletedIds?: string[];
  initialCertificateCode?: string | null;
  canTrackProgress?: boolean;
  initialLessonId?: string;
  initialTab?: 'notes' | 'assignment';
  initialAssignmentId?: string;
}

function SlidesViewer({ url }: { url: string }) {
  const clean = url.split('?')[0].toLowerCase();
  const isPdf = clean.endsWith('.pdf');
  const name = url.split('/').pop();

  if (isPdf) {
    return (
      <iframe
        src={`${url}#toolbar=0&navpanes=0&view=FitH`}
        title={`Slides: ${name}`}
        className="w-full h-[70vh] min-h-[420px] rounded-xl border border-gray-200 bg-gray-100"
      />
    );
  }

  if (clean.endsWith('.pptx')) {
    return <PptxViewer url={url} name={name || 'slides.pptx'} />;
  }

  return (
    <div className="w-full aspect-video rounded-xl border border-gray-200 bg-gray-100 flex flex-col items-center justify-center p-6 text-center gap-3">
      <FileText className="w-12 h-12 text-amber-600" />
      <div className="text-base font-semibold text-gray-900">{name}</div>
      <p className="text-sm text-gray-600 max-w-md">
        A preview is not available for this file type. Please ask your instructor to upload it as a PDF or PowerPoint file.
      </p>
    </div>
  );
}

// Renders a .pptx entirely in the browser (the file never leaves this site).
function PptxViewer({ url, name }: { url: string; name: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let previewer: { destroy: () => void } | null = null;
    setStatus('loading');
    host.innerHTML = '';

    (async () => {
      try {
        const [{ init }, res] = await Promise.all([
          import('pptx-preview'),
          fetch(url),
        ]);
        if (!res.ok) throw new Error('Could not load the file');
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const width = host.clientWidth || 960;
        previewer = init(host, { width, height: Math.round((width * 9) / 16), mode: 'slide' });
        await (previewer as any).preview(buffer);
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try {
        previewer?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [url]);

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-xl border border-gray-200 bg-gray-100 overflow-hidden min-h-[240px]">
        <div ref={hostRef} className="w-full flex justify-center" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 text-sm">
            <Spinner />
            <span>Loading slides...</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <FileText className="w-10 h-10 text-amber-600" />
            <div className="text-base font-semibold text-gray-900">{name}</div>
            <p className="text-sm text-gray-600 max-w-md">
              The slides could not be displayed. Please refresh the page or try again in a moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


function TestLink({ test, pad }: { test: any; pad: string }) {
  const isAssignment = test.kind === 'ASSIGNMENT';
  return (
    <Link href={`/assignments/tests/${test.id}`} className={`w-full text-left ${pad} py-3 text-sm flex items-center justify-between gap-3 text-gray-700 hover:bg-gray-100 transition`}>
      <span className="flex items-center gap-2.5 truncate">
        <ClipboardCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span className="truncate">{test.title}</span>
      </span>
      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 rounded px-1.5 py-0.5 shrink-0">{isAssignment ? 'MCQ assignment' : 'Test'}</span>
    </Link>
  );
}

/** Assignments and tests that sit inside a module, listed under its lessons. */
function ModuleExtras({ mod, activeAssignmentId, submittedIds, onOpenAssignment, pad }: { mod: any; activeAssignmentId: string | null; submittedIds: string[]; onOpenAssignment: (id: string) => void; pad: string }) {
  return (
    <>
      {mod.assignments?.map((a: any) => (
        <button
          key={a.id}
          onClick={() => onOpenAssignment(a.id)}
          className={`w-full text-left ${pad} py-3 text-sm flex items-center justify-between gap-3 transition ${activeAssignmentId === a.id ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          <span className="flex items-center gap-2.5 truncate">
            {submittedIds.includes(a.id) ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <PencilLine className="w-4 h-4 text-amber-700 shrink-0" />}
            <span className="truncate">{a.title}</span>
          </span>
          <span className="text-xs font-semibold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">Assignment</span>
        </button>
      ))}
      {mod.tests?.map((t: any) => (
        <TestLink key={t.id} test={t} pad={pad} />
      ))}
    </>
  );
}

function AssignmentPanel({ assignment: a, submitted, justSubmitted, text, setText, submitting, onSubmit, canSubmit }: { assignment: any; submitted: boolean; justSubmitted: boolean; text: string; setText: (v: string) => void; submitting: boolean; onSubmit: () => void; canSubmit: boolean }) {
  let attachments: { name: string; url: string }[] = [];
  try {
    attachments = JSON.parse(a.attachments || '[]');
  } catch {}
  const previous = a.submissions?.[0];
  return (
    <div className="w-full px-5 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-6 max-w-4xl">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-amber-700">{a.moduleTitle} · Assignment</span>
        <h2 className="text-2xl font-semibold text-gray-900">{a.title}</h2>
        <p className="text-sm text-gray-600">Maximum score: {a.maxScore} points</p>
      </div>
      {a.description && <p className="text-base text-gray-700">{a.description}</p>}
      {a.instructions && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Instructions</h3>
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line max-w-prose">{a.instructions}</p>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
          <ul className="space-y-2">
            {attachments.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:underline">
                  <Download className="w-4 h-4" /> {f.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {previous && !justSubmitted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 space-y-1">
          <p className="font-semibold">You submitted this assignment.</p>
          {previous.status === 'GRADED' && <p>Score: {previous.score}/{a.maxScore}{previous.feedback ? ` · ${previous.feedback}` : ''}</p>}
          {previous.content && <p className="text-gray-700 whitespace-pre-line">{previous.content}</p>}
        </div>
      )}
      {justSubmitted ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold">Assignment submitted</div>
            <div className="text-gray-700 mt-0.5">Your answer is with the faculty for grading.</div>
          </div>
        </div>
      ) : canSubmit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-3"
        >
          <label htmlFor="answer" className="block text-sm font-semibold text-gray-700">
            {submitted ? 'Submit a new answer' : 'Your answer'}
          </label>
          <textarea id="answer" rows={8} required value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer here" className="w-full p-3.5 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff]" />
          <button type="submit" disabled={submitting} className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition active:scale-95 disabled:opacity-75 inline-flex items-center gap-2">
            {submitting ? <ButtonSpinner label="Submitting..." /> : (<><Send className="w-3.5 h-3.5" /><span>Submit assignment</span></>)}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">Preview only: students submit their answers here.</p>
      )}
    </div>
  );
}

export function ClassroomPlayerClient({ course, user, initialCompletedIds = [], initialCertificateCode = null, canTrackProgress = true, initialLessonId, initialAssignmentId }: Props) {
  // Collect all lessons in a flat list
  const allLessons: any[] = [];
  course.modules?.forEach((mod: any) => {
    mod.lessons?.forEach((l: any) => {
      allLessons.push({ ...l, moduleTitle: mod.title });
    });
  });

  const [activeLesson, setActiveLesson] = useState<any>(allLessons.find((l) => l.id === initialLessonId) || allLessons[0] || null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedIds);
  const [certificateCode, setCertificateCode] = useState<string | null>(initialCertificateCode);
  const [savingProgress, setSavingProgress] = useState(false);
  const [mobileSyllabusOpen, setMobileSyllabusOpen] = useState(false);

  // Assignment submission state
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Slides, PDFs and audio lessons are shown in the main area itself, so the tabs below always start on the notes.
  const tabFor = (_l: any): 'notes' | 'slides' | 'audio' => 'notes';
  const [activeTab, setActiveTab] = useState<'notes' | 'slides' | 'audio' | 'infographic'>(tabFor(allLessons.find((l) => l.id === initialLessonId) || allLessons[0]));

  // Written assignments live inside modules and open in the main area, like a lesson does.
  const allAssignments: any[] = [];
  course.modules?.forEach((mod: any) => mod.assignments?.forEach((a: any) => allAssignments.push({ ...a, moduleTitle: mod.title })));
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(allAssignments.some((a) => a.id === initialAssignmentId) ? (initialAssignmentId as string) : null);
  const activeAssignment = allAssignments.find((a) => a.id === activeAssignmentId) || null;
  const [submittedIds, setSubmittedIds] = useState<string[]>(allAssignments.filter((a) => a.submissions?.length).map((a) => a.id));

  const openLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setActiveAssignmentId(null);
    setActiveTab(tabFor(lesson));
    setSubmissionSuccess(false);
    setSubmissionText('');
  };
  const openAssignment = (id: string) => {
    setActiveAssignmentId(id);
    setSubmissionSuccess(false);
    setSubmissionText('');
  };

  const toggleComplete = async (id: string) => {
    const nowCompleted = !completedLessonIds.includes(id);
    const previous = completedLessonIds;
    setCompletedLessonIds(nowCompleted ? [...previous, id] : previous.filter((item) => item !== id));
    if (!canTrackProgress) return; // admin preview: nothing to persist

    setSavingProgress(true);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: id, completed: nowCompleted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save progress');
      setCompletedLessonIds(data.completedLessonIds);
      if (data.certificateCode) setCertificateCode(data.certificateCode);
    } catch {
      setCompletedLessonIds(previous); // roll back so the UI matches what was saved
    } finally {
      setSavingProgress(false);
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
      setSubmittedIds((cur) => (cur.includes(assignmentId) ? cur : [...cur, assignmentId]));
    } catch (err: any) {
      alert(err.message || 'Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Privacy-enhanced YouTube player (no tracking cookies until played), related videos limited to this channel's.
  const getYouTubeEmbedUrl = (url: string) => {
    const id = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)?.[1];
    if (!id) return url;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=1`;
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col transition-colors">
      {/* Top Classroom Bar */}
      <header className="h-[72px] bg-white border-b border-gray-200 px-5 sm:px-8 flex items-center justify-between z-30 shrink-0 shadow-sm transition-colors">
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
              {activeAssignment?.title || activeLesson?.title || 'Classroom Player'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Syllabus Button */}
          <button
            onClick={() => setMobileSyllabusOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-amber-700 hover:bg-gray-200 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Syllabus</span>
          </button>

          {!activeAssignment && (
          <button
            onClick={() => activeLesson && toggleComplete(activeLesson.id)}
            disabled={savingProgress}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border disabled:opacity-60 ${
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
          )}
        </div>
      </header>

      {certificateCode && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 sm:px-8 py-3 flex items-center justify-between gap-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2 font-semibold">
            <AwardIcon className="w-4 h-4 shrink-0" />
            Course completed. Your certificate is ready.
          </span>
          <Link href={`/certificates/${certificateCode}`} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition">
            View certificate
          </Link>
        </div>
      )}

      {/* Main Workspace: Video + Syllabus */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video Player Stage & Lesson Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {activeAssignment ? (
            <AssignmentPanel
              assignment={activeAssignment}
              submitted={submittedIds.includes(activeAssignment.id)}
              justSubmitted={submissionSuccess}
              text={submissionText}
              setText={setSubmissionText}
              submitting={submitting}
              onSubmit={() => handleAssignmentSubmit(activeAssignment.id)}
              canSubmit={canTrackProgress}
            />
          ) : (
          <>
          {/* MAIN AREA: sized to the lesson, so a slide deck or PDF is not squeezed under an empty video box */}
          {(() => {
            const l = activeLesson;
            const isDoc = (l?.type === 'PPT' || l?.type === 'PDF') && l?.fileUrl;
            const isAudio = l?.type === 'AUDIO' && l?.audioUrl;
            const isVideo = l?.type === 'YOUTUBE' ? Boolean(l?.videoUrl) : Boolean(l?.videoUrl) && l?.type !== 'AUDIO' && l?.type !== 'PPT' && l?.type !== 'PDF';
            if (!isDoc && !isAudio && !isVideo) return null;
            return (
              <div className="px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8">
                {isVideo ? (
                  <div className="w-full bg-black aspect-video max-h-[60vh] rounded-2xl overflow-hidden flex items-center justify-center relative">
                    {l.type === 'YOUTUBE' ? (
                      <iframe
                        src={getYouTubeEmbedUrl(l.videoUrl)}
                        title={l.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : null}
                    {l.type === 'YOUTUBE' ? (
                      // The player's title bar holds "Watch on YouTube", "Copy link" and Share. Nothing can switch them
                      // off, so this invisible strip sits on top of that bar and swallows the clicks.
                      <div className="absolute inset-x-0 top-0 h-16 z-10" aria-hidden onContextMenu={(e) => e.preventDefault()} />
                    ) : (
                      <video key={l.videoUrl} src={l.videoUrl} controls autoPlay playsInline controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-contain" />
                    )}
                  </div>
                ) : isDoc ? (
                  // Slides are shown here, in the page. There is no download button.
                  <div onContextMenu={(e) => e.preventDefault()}>
                    <SlidesViewer url={l.fileUrl} />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Headphones className="w-6 h-6" aria-hidden />
                    </div>
                    <audio key={l.audioUrl} controls controlsList="nodownload" src={l.audioUrl} className="w-full min-w-0" />
                  </div>
                )}
              </div>
            );
          })()}

          {/* LESSON DETAILS & INTERACTION TABS */}
          <div className="w-full px-5 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 border-b border-gray-200 pb-6">
              <div className="min-w-0 md:flex-1">
                <span className="text-xs font-semibold text-amber-700">
                  {activeLesson?.moduleTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 md:truncate" title={activeLesson?.title}>
                  {activeLesson?.title}
                </h2>
              </div>

              {/* Lesson Action Tabs */}
              <div className="flex flex-nowrap items-center gap-1.5 p-1.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold overflow-x-auto no-scrollbar md:shrink-0 max-w-full whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-4 py-2 rounded-lg transition shrink-0 ${
                    activeTab === 'notes'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Lecture Notes
                </button>
                {activeLesson?.fileUrl && activeLesson.type !== 'PPT' && activeLesson.type !== 'PDF' && (
                <button
                  onClick={() => setActiveTab('slides')}
                  className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'slides'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Slides</span>
                </button>
                )}
                {activeLesson?.audioUrl && activeLesson.type !== 'AUDIO' && (
                  <button
                    onClick={() => setActiveTab('audio')}
                    className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
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
                    className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                      activeTab === 'infographic'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Infographic</span>
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: LECTURE OVERVIEW & NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-6 text-base text-gray-700 leading-relaxed">
                {activeLesson?.content ? <p className="max-w-3xl whitespace-pre-line">{activeLesson.content}</p> : <p className="max-w-3xl text-gray-600">There are no notes for this lesson.</p>}

              </div>
            )}

            {/* TAB 2: PRESENTATION SLIDES VIEWER */}
            {activeTab === 'slides' && (
              <div className="space-y-4">
                {activeLesson?.fileUrl ? (
                  <div className="p-5 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900">Class slides</h4>

                    <SlidesViewer url={activeLesson.fileUrl} />
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
                      <audio controls controlsList="nodownload" src={activeLesson.audioUrl} className="w-full" />
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span>Audio Recording</span>
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

          </div>
          </>
          )}
        </div>

        {/* Right Side: Desktop Fixed Syllabus Drawer */}
        <aside className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex-col overflow-y-auto shrink-0 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Course Curriculum</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {allLessons.length} lectures{allAssignments.length ? ` · ${allAssignments.length} assignments` : ''}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {course.modules?.map((mod: any) => (
              <div key={mod.id} className="py-3">
                <div className="px-6 py-2 text-sm font-semibold text-gray-600">
                  {mod.title}
                </div>
                <div className="space-y-0.5">
                  {mod.lessons?.map((lesson: any) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isDone = completedLessonIds.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => openLesson(lesson)}
                        className={`w-full text-left px-6 py-3.5 text-sm flex items-center justify-between gap-3 transition ${
                          isSelected && !activeAssignment
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
                  <ModuleExtras mod={mod} activeAssignmentId={activeAssignmentId} submittedIds={submittedIds} onOpenAssignment={openAssignment} pad="px-6" />
                </div>
              </div>
            ))}
            {course.tests?.length > 0 && (
              <div className="py-3">
                <div className="px-6 py-2 text-sm font-semibold text-gray-600">Course tests</div>
                <div className="space-y-0.5">
                  {course.tests.map((t: any) => (
                    <TestLink key={t.id} test={t} pad="px-6" />
                  ))}
                </div>
              </div>
            )}
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
                        openLesson(lesson);
                        setMobileSyllabusOpen(false);
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
                  <ModuleExtras mod={mod} activeAssignmentId={activeAssignmentId} submittedIds={submittedIds} onOpenAssignment={(id) => { openAssignment(id); setMobileSyllabusOpen(false); }} pad="px-3" />
                </div>
              ))}
              {course.tests?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-500">Course tests</div>
                  {course.tests.map((t: any) => (
                    <TestLink key={t.id} test={t} pad="px-3" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
