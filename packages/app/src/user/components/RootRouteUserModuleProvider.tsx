import { ReactNode } from 'react';
import { SessionExpiredPromptSignInOnce } from './SessionExpiredPromptSignInOnce';

export function RootRouteUserModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <SessionExpiredPromptSignInOnce />

      {children}
    </>
  );
}
