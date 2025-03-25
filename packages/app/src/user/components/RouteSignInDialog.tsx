import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';

import { router } from '../../router';
import { useGetCanGoBack } from '../../router/context/get-can-go-back';
import { OnCloseProvider } from '../../utils/context/on-close';

import { SignInModal } from './SignInModal';

/**
 * Sign in modal that is based on query search ?signIn=true
 */
export function RouteSignInDialog() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const getCanGoBack = useGetCanGoBack();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  function handleExited() {
    if (getCanGoBack()) {
      router.history.back();
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, signIn: undefined }),
        replace: true,
      });
    }
  }

  return (
    <OnCloseProvider onClose={handleClose}>
      <SignInModal
        open={open}
        onClose={handleClose}
        DialogProps={{
          onTransitionExited: handleExited,
        }}
      />
    </OnCloseProvider>
  );
}
