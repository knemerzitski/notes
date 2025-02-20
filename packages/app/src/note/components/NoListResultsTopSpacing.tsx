import { ReactNode } from 'react';

import { NoListResultsSpacing } from './NoListResultsSpacing';

export function NoListResultsTopSpacing({ children }: { children: ReactNode }) {
  return (
    <>
      <NoListResultsSpacing />
      {children}
    </>
  );
}
