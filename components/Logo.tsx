import React from 'react';

/** Official Central Institute of Management - India logo (public/logo.webp, 482x522). */
export function Logo({ className = 'h-10', alt = 'CIM India logo' }: { className?: string; alt?: string }) {
  return <img src="/logo.webp" alt={alt} width={482} height={522} className={`w-auto shrink-0 select-none ${className}`} draggable={false} />;
}
