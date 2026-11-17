import React from 'react';
import { PageSpinner } from '@/components/ui/Loaders';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink-950 flex items-center justify-center">
      <PageSpinner message="Loading CIM India..." />
    </div>
  );
}
