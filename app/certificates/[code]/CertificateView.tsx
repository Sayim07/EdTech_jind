'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface Props {
  studentName: string;
  courseTitle: string;
  instructor: string;
  completedOn: string;
  code: string;
}

export function CertificateView({ studentName, courseTitle, instructor, completedOn, code }: Props) {
  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } body { background: #fff !important; } }`}</style>

      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/purchases" className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to purchases
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-10 px-4 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm flex items-center gap-2 transition active:scale-[0.98]"
        >
          <Download className="w-4 h-4" /> Download / Print
        </button>
      </div>

      <article
        className="max-w-4xl mx-auto bg-white border-[10px] border-amber-600 p-3 print:max-w-none print:w-screen print:h-screen print:border-[14px]"
        aria-label={`Certificate of completion for ${courseTitle}`}
      >
        <div className="border border-amber-300 h-full px-6 sm:px-14 py-10 sm:py-14 text-center flex flex-col items-center justify-center gap-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Logo className="h-16" />
            <span className="text-2xl font-semibold">CIM India</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-amber-800 leading-tight">Certificate of Completion</h1>
          <p className="text-gray-600">This certifies that</p>
          <p className="text-3xl sm:text-5xl font-semibold text-gray-900 border-b-2 border-amber-600 pb-2 px-6 max-w-full break-words">
            {studentName}
          </p>
          <p className="text-gray-600">has successfully completed every lesson of the masterclass</p>
          <p className="text-2xl sm:text-3xl font-semibold text-amber-700 max-w-2xl">{courseTitle}</p>

          <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-700 items-end">
            <div>
              <div className="font-semibold text-gray-900">{completedOn}</div>
              <div className="border-t border-gray-300 mt-1 pt-1 text-xs text-gray-600">Date of completion</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{instructor}</div>
              <div className="border-t border-gray-300 mt-1 pt-1 text-xs text-gray-600">Instructor</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900 tabular-nums">{code}</div>
              <div className="border-t border-gray-300 mt-1 pt-1 text-xs text-gray-600">Certificate ID</div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
