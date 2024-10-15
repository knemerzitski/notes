import { ReactNode } from 'react';
import { SignInModalProvider } from '../context/sign-in-modal';
import { CurrentUserChangedRefresh } from './CurrentUserChangedRefresh';
import { SignedInUserEventsSubscription } from './SignedInUserEventsSubscription';

export function AppUserModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <CurrentUserChangedRefresh />
      <SignedInUserEventsSubscription />
      <SignInModalProvider>{children}</SignInModalProvider>
    </>
  );
}
