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
import {
  FormEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import isTruthy from '~utils/isTruthy';

import useScript from '../../hooks/useScript';

const MOCK =
  import.meta.env.MODE === 'production'
    ? false
    : isTruthy(import.meta.env.VITE_MOCK_GOOGLE_AUTH);

type CredentialResponseFn = (response: google.accounts.id.CredentialResponse) => void;

interface ClientScriptContextInterface {
  isLoaded: boolean;
  /**
   * @param responseSub Hanle credential response
   * @returns Unsubscribe function
   */
  subscribeToCallback: (responseSub: CredentialResponseFn) => () => void;
}

const ClientScriptContext = createContext<ClientScriptContextInterface | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useClientScript() {
  const ctx = useContext(ClientScriptContext);
  if (ctx === null) {
    throw new Error('useClientScript() requires context <ClientScriptProvider>');
  }
  return ctx;
}

interface ClientScriptProviderProps {
  scriptSrc: string;
  clientId: string;
  children: ReactNode;
}

export function ClientScriptProvider({
  clientId,
  scriptSrc,
  children,
}: ClientScriptProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const subsRef = useRef(new Set<CredentialResponseFn>());

  const handleCredentialResponse = useCallback<CredentialResponseFn>((response) => {
    for (const sub of subsRef.current) {
      sub(response);
    }
  }, []);

  useScript({
    noScript: MOCK,
    src: scriptSrc,
    async: true,
    onload: () => {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      setIsLoaded(true);
    },
  });

  const subscribeToCallback = useCallback<
    ClientScriptContextInterface['subscribeToCallback']
  >((sub) => {
    subsRef.current.add(sub);
    return () => {
      subsRef.current.delete(sub);
    };
  }, []);

  return (
    <ClientScriptContext.Provider
      value={{
        isLoaded,
        subscribeToCallback,
      }}
    >
      {children}
    </ClientScriptContext.Provider>
  );
}

interface SignInButtonProps {
  /**
   * Pass a useCallback function as it's used in useEffect.
   * Is called for any callback, even if this button didn't initiate the callback.
   */
  onCallback: CredentialResponseFn;
  onClick?: () => void;
}

export function SignInButton({ onCallback, onClick }: SignInButtonProps) {
  const { isLoaded: isScriptLoaded, subscribeToCallback } = useClientScript();
  const elRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    return subscribeToCallback(onCallback);
  }, [subscribeToCallback, onCallback]);

  useEffect(() => {
    if (!elRef.current) return;

    if (isScriptLoaded) {
      google.accounts.id.renderButton(elRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: theme.palette.mode === 'dark' ? 'filled_black' : 'filled_blue',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        click_listener: onClick,
        width: 192,
      });
    }
  }, [theme, isScriptLoaded, onClick]);

  if (MOCK) {
    return <MockSignInButton onCallback={onCallback} onClick={onClick} />;
  }

  if (!isScriptLoaded) {
    return <LinearProgress />;
  }

  return <div ref={elRef}></div>;
}

function MockSignInButton({ onCallback, onClick }: SignInButtonProps) {
  const [open, setOpen] = useState(false);

  function handleClickOpen() {
    setOpen(true);
    onClick?.();
  }

  function handleClose() {
    setOpen(false);
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
            onCallback({
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
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Sign In</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
