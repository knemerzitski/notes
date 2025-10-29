import { Box, css, LinearProgress, styled, useTheme } from '@mui/material';
import { lazy, Suspense, useEffect, useRef } from 'react';

import { GOOGLE } from '../../../third-party';
import { useGoogleAuth } from '../context/google-auth';

const MockGoogleLoginButton = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('./MockGoogleLoginButton').then((res) => ({
        default: res.MockGoogleLoginButton,
      }))
    );

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

export function GoogleLoginButton({
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
      size: 'medium',
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

  if (GOOGLE.mock) {
    return (
      <Suspense fallback={<LinearProgress />}>
        <MockGoogleLoginButton
          idConfig={idConfig}
          buttonConfig={buttonConfig}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Suspense>
    );
  }

  if (!isScriptLoaded) {
    return <LinearProgress />;
  }

  return <BoxStyled ref={btnContainerRef}></BoxStyled>;
}

const BoxStyled = styled(Box)(css`
  /* Prevent layout shift when button is loading */
  height: 34px;
`);
