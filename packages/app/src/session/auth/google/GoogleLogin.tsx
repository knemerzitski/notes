import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  TextField,
  useTheme,
} from '@mui/material';
import { FormEvent, useEffect, useRef, useState } from 'react';

import isTruthy from '~utils/isTruthy';

import { useGoogleAuth } from './GoogleAuthProvider';

const MOCK =
  import.meta.env.MODE === 'production'
    ? false
    : isTruthy(import.meta.env.VITE_MOCK_GOOGLE_AUTH);

export interface GoogleLoginProps {
  onSuccess: (response: google.accounts.id.CredentialResponse) => void;
  onError?: () => void;
  idConfig?: Omit<google.accounts.id.IdConfiguration, 'client_id' | 'callback'>;
  buttonConfig?: Partial<google.accounts.id.GsiButtonConfiguration>;
  useOneTap?: boolean;
  oneTapMomentListener?: (
    promptMomentNotification: google.accounts.id.PromptMomentNotification
  ) => void;
}

export default function GoogleLogin({
  onSuccess,
  onError,
  idConfig,
  buttonConfig,
  useOneTap,
  oneTapMomentListener,
}: GoogleLoginProps) {
  const btnContainerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const { clientId, isScriptLoaded } = useGoogleAuth();

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const oneTapMomentListenerRef = useRef(oneTapMomentListener);
  oneTapMomentListenerRef.current = oneTapMomentListener;

  useEffect(() => {
    if (!isScriptLoaded || !btnContainerRef.current) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          return onErrorRef.current?.();
        }
        onSuccessRef.current(response);
      },
      ...idConfig,
    });

    google.accounts.id.renderButton(btnContainerRef.current, {
      type: 'standard',
      shape: 'rectangular',
      theme: theme.palette.mode === 'dark' ? 'filled_black' : 'filled_blue',
      text: 'signin_with',
      size: 'large',
      logo_alignment: 'left',
      width: 192,
      ...buttonConfig,
    });

    if (useOneTap) {
      google.accounts.id.prompt(oneTapMomentListenerRef.current);
    }

    return () => {
      if (useOneTap) {
        google.accounts.id.cancel();
      }
    };
  }, [clientId, isScriptLoaded, idConfig, buttonConfig, theme, useOneTap]);

  if (MOCK) {
    return (
      <MockGoogleLogin
        idConfig={idConfig}
        buttonConfig={buttonConfig}
        onSuccess={onSuccess}
        onError={onError}
      />
    );
  }

  if (!isScriptLoaded) {
    return <LinearProgress />;
  }

  return <div ref={btnContainerRef}></div>;
}

function MockGoogleLogin({
  idConfig,
  buttonConfig,
  onSuccess,
  onError,
}: GoogleLoginProps) {
  const [open, setOpen] = useState(false);

  function handleClickOpen() {
    setOpen(true);
    buttonConfig?.click_listener?.();
  }

  function handleClose() {
    setOpen(false);
  }

  function handleSendError() {
    onError?.();
    handleClose();
  }

  return (
    <>
      <Button size="small" onClick={handleClickOpen}>
        Sign in with Google
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: 'form',
          onSubmit: (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const formObj = Object.fromEntries(formData.entries()) as {
              id: string;
              name: string;
              email: string;
            };
            formObj.name = formObj.name.trim().length > 0 ? formObj.name : 'Anonymous';
            formObj.email =
              formObj.email.trim().length > 0 ? formObj.email : 'anonymous@unknown';
            onSuccess({
              credential: JSON.stringify(formObj),
              select_by: 'btn',
            });
            handleClose();
          },
        }}
      >
        <DialogTitle>Mock sign in with Google</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This is only intended to be used during development. Never use it in
            production!
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            fullWidth
            name="id"
            label="ID"
            defaultValue={idConfig?.login_hint}
          ></TextField>
          <TextField
            margin="dense"
            fullWidth
            name="name"
            label="Display name"
          ></TextField>
          <TextField margin="dense" fullWidth name="email" label="Email"></TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendError}>Send error</Button>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Sign In</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
