'use client';

import React from 'react';

// ============================================================================
// 1. SPINNER COMPONENTS (FOR ACTION STATES, BUTTONS, UPLOADS, SUBMISSIONS)
// ============================================================================

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'gray' | 'current';
  label?: string;
}

const SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const VARIANT_MAP = {
  primary: 'text-amber-600 dark:text-amber-400',
  white: 'text-white',
  gray: 'text-gray-500 dark:text-gray-400',
  current: 'text-current',
};

export function Spinner({
  size = 'md',
  variant = 'primary',
  label,
  className = '',
  ...props
}: SpinnerProps) {
  const sizeClass = SIZE_MAP[size];
  const colorClass = VARIANT_MAP[variant];

  return (
    <div
      role="status"
      aria-label={label || 'Loading'}
      className={`inline-flex items-center gap-2 ${className}`}
      {...props}
    >
      <svg
        className={`animate-spin ${sizeClass} ${colorClass} shrink-0`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className="text-xs font-medium text-current select-none">{label}</span>
      )}
    </div>
  );
}

/**
 * ButtonSpinner: Compact spinner designed specifically for button loading states.
 */
export function ButtonSpinner({ label }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <svg
        className="animate-spin w-3.5 h-3.5 text-current shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <span className="text-xs font-semibold">{label}</span>}
    </div>
  );
}

/**
 * PageSpinner: Centered fullscreen or full-container loading state.
 */
export function PageSpinner({ message = 'Loading content...' }: { message?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Subtle pulsing background glow */}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-amber-400/10 animate-ping absolute" />
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-center shadow-sm">
          <Spinner size="md" variant="primary" />
        </div>
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">
        {message}
      </p>
    </div>
  );
}

// ============================================================================
// 2. SKELETON LOADERS (FOR CONTENT LOADING STATES & ROUTE TRANSITIONS)
// ============================================================================

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/80 dark:bg-ink-800/80 ${className}`}
      {...props}
    />
  );
}

/**
 * CourseCardSkeleton: Exact 1:1 match for course cards in catalog & dashboard.
 */
export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-ink-900 border border-gray-200/70 dark:border-gray-800 shadow-sm">
      {/* Thumbnail placeholder */}
      <Skeleton className="w-full aspect-[16/10] rounded-none rounded-t-2xl sm:rounded-t-3xl" />

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Tag & Category */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>

          {/* Title (2 lines) */}
          <Skeleton className="h-5 w-4/5 rounded-md" />
          <Skeleton className="h-5 w-3/5 rounded-md" />

          {/* Short description */}
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
          </div>
        </div>

        {/* Footer info (Lectures & Price) */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-12 rounded" />
          </div>
          <Skeleton className="h-4 w-16 rounded" />
        </div>

        {/* Button */}
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * CourseGridSkeleton: Responsive grid of course card skeletons.
 */
export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * DashboardSkeleton: Full skeleton for Student Dashboard (/dashboard).
 */
export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Welcome Banner Skeleton */}
      <div className="bg-white dark:bg-ink-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
          <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 pt-3 md:pt-0 md:pl-6">
            <div className="space-y-1 text-center">
              <Skeleton className="h-7 w-12 mx-auto rounded" />
              <Skeleton className="h-3 w-16 mx-auto rounded" />
            </div>
            <div className="h-7 w-px bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-1 text-center">
              <Skeleton className="h-7 w-12 mx-auto rounded" />
              <Skeleton className="h-3 w-16 mx-auto rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-full sm:w-72 rounded-xl" />
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>

      {/* Course Grid */}
      <CourseGridSkeleton count={6} />
    </div>
  );
}

/**
 * CoursesCatalogSkeleton: Full skeleton for Course Catalog (/courses).
 */
export function CoursesCatalogSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 pb-20 md:pb-10 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      {/* Search & Category Filter Box */}
      <div className="bg-white dark:bg-ink-900 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center gap-2 pt-1 overflow-x-hidden">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
      </div>

      {/* Course Cards Grid */}
      <CourseGridSkeleton count={6} />
    </div>
  );
}

/**
 * CourseDetailsSkeleton: Full skeleton for Course Landing Page (/courses/[slug]).
 */
export function CourseDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-parchment-50 dark:bg-ink-950 pb-20">
      {/* Hero Header */}
      <div className="bg-ink-950 border-b border-gray-800 py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-4 w-32 rounded bg-gray-800" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24 rounded bg-gray-800" />
                <Skeleton className="h-5 w-20 rounded bg-gray-800" />
              </div>
              <Skeleton className="h-10 w-4/5 rounded-lg bg-gray-800" />
              <Skeleton className="h-4 w-full rounded bg-gray-800" />
              <Skeleton className="h-4 w-3/4 rounded bg-gray-800" />

              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-4 w-24 rounded bg-gray-800" />
                <Skeleton className="h-4 w-24 rounded bg-gray-800" />
                <Skeleton className="h-4 w-28 rounded bg-gray-800" />
              </div>
            </div>

            {/* Right Action Box */}
            <div className="lg:col-span-4 bg-white dark:bg-ink-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-7 w-28 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Modules Skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-3.5 w-64 rounded" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-ink-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3"
            >
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ClassroomPlayerSkeleton: Skeleton for Classroom Learning (/learn/[slug]).
 */
export function ClassroomPlayerSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink-950 flex flex-col">
      {/* Top Navbar Skeleton */}
      <div className="h-14 bg-white dark:bg-ink-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Classroom Content Skeleton */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video & Notes */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Video Stage */}
          <div className="w-full aspect-video max-h-[460px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <Spinner size="lg" variant="primary" label="Loading classroom..." />
          </div>

          {/* Notes & Tabs */}
          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56 rounded-md" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-4/6 rounded" />
            </div>
          </div>
        </div>

        {/* Right Side: Syllabus Sidebar */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-ink-900 p-4 space-y-3 shrink-0">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AdminDashboardSkeleton: Full skeleton for Admin Portal (/admin).
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-ink-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-ink-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-ink-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-64 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
