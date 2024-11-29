import { ReactNode } from 'react';
import { SignInModalProvider } from '../context/sign-in-modal';
import { ShowCachedUserMessages } from './ShowCachedMessages';
import { CurrentUserIdProvider } from './CurrentUserIdProvider';
import { SignedInUserEventsSubscription } from './SignedInUserEventsSubscription';

export function AppUserModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <CurrentUserIdProvider>
        <SignedInUserEventsSubscription />
        <ShowCachedUserMessages />
        <SignInModalProvider>{children}</SignInModalProvider>
      </CurrentUserIdProvider>
    </>
  );
}
