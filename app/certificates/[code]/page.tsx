import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { CertificateView } from './CertificateView';

export const metadata = { title: 'Certificate of Completion | CIM India' };

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/certificates/${code}`);

  const enrollment = await prisma.enrollment.findUnique({
    where: { certificateCode: code },
    include: { user: { select: { name: true } }, course: { select: { title: true, instructorName: true } } },
  });

  // Only the certificate owner (or an admin) can open it.
  if (!enrollment || !enrollment.completedAt || (enrollment.userId !== user.id && user.role !== 'ADMIN')) {
    notFound();
  }

  return (
    <CertificateView
      studentName={enrollment.user.name}
      courseTitle={enrollment.course.title}
      instructor={enrollment.course.instructorName}
      completedOn={enrollment.completedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      code={code}
    />
  );
}
