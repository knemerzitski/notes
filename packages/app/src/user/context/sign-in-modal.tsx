import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { SignInModal } from '../components/SignInModal';
import { UserIdProvider } from './user-id';

// create a base interface

type OpenSignInModalClosure = (hintUserId?: string) => void;

const SignInModalContext = createContext<OpenSignInModalClosure | null>(null);

export function useOpenSignInModal(): OpenSignInModalClosure {
  const ctx = useContext(SignInModalContext);
  if (ctx === null) {
    throw new Error('useOpenSignInModal() requires context <SignInModalProvider>');
  }
  return ctx;
}

export function SignInModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  const handleOpen: OpenSignInModalClosure = useCallback((hintUserId) => {
    setUserId(hintUserId);
    setOpen(true);
  }, []);

  function handleClose() {
    setOpen(false);
  }

  return (
    <UserIdProvider userId={userId}>
      <SignInModalContext.Provider value={handleOpen}>
        {children}
      </SignInModalContext.Provider>
      <SignInModal open={open} onClose={handleClose} />
    </UserIdProvider>
  );
}
