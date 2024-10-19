import { ReactNode } from 'react';
import { SignInModalProvider } from '../context/sign-in-modal';
import { CurrentUserChangedRefresh } from './CurrentUserChangedRefresh';
import { ShowCachedUserMessages } from './ShowCachedMessages';
import { CurrentUserIdProvider } from './CurrentUserIdProvider';
import { SignedInUserEventsSubscription } from './SignedInUserEventsSubscription';

export function AppUserModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <CurrentUserChangedRefresh />
      <SignedInUserEventsSubscription />
      <CurrentUserIdProvider>
        <ShowCachedUserMessages />
      </CurrentUserIdProvider>
      <SignInModalProvider>{children}</SignInModalProvider>
    </>
  );
}
