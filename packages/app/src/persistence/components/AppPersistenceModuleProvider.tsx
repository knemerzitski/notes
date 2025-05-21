import { ReactNode } from 'react';

import { ConfirmLeaveIsPending } from './ConfirmLeaveIsPending';
import { PersistStatus } from './PersistStatus';

export function AppPersistenceModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <PersistStatus />
      <ConfirmLeaveIsPending triggerFlush={true} />
      {children}
    </>
  );
}
