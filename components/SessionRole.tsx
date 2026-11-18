'use client';

import React, { createContext, useContext } from 'react';

/** Role read from the session cookie on the server, so the first paint already knows which menu to show. */
const RoleContext = createContext<string | undefined>(undefined);

export function SessionRoleProvider({ role, children }: { role?: string; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export const useInitialRole = () => useContext(RoleContext);
