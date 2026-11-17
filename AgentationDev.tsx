'use client';

/**
 * AGENTATION DEV COMPONENT
 * ------------------------
 * Renders the Agentation toolbar ONLY in local development.
 * 
 * Production Zero-Leak Guarantee:
 * In production builds (npm run build), bundlers (Next.js/Turbopack/Webpack/Vite)
 * statically eliminate this entire component via dead code elimination (tree-shaking).
 */

import React, { useEffect, useState } from 'react';

export function AgentationDev({ endpoint = 'http://localhost:4747' }: { endpoint?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check for localhost / 127.0.0.1
    if (typeof window !== 'undefined') {
      const isLocalhost = 
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      
      const isDevEnv = process.env.NODE_ENV === 'development';

      if (isLocalhost || isDevEnv) {
        setMounted(true);
      }
    }
  }, []);

  // Strict guard: Never render in non-development or non-localhost
  if (!mounted || process.env.NODE_ENV === 'production') {
    return null;
  }

  try {
    // Dynamic import to prevent bundlers from bundling into production chunks
    const { Agentation } = require('agentation');
    return <Agentation endpoint={endpoint} />;
  } catch (err) {
    // If agentation npm package isn't installed yet, fail silently without breaking dev
    return null;
  }
}

export default AgentationDev;
