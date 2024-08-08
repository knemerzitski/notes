import { useSnackbarError } from '../../common/components/snackbar-alert-provider';
import { useSignInWithGoogle } from '../hooks/use-sign-in-with-google';
import { GoogleLoginProps, GoogleLogin as BaseGoogleLogin } from '../third-party/google/google-login';

export function GoogleLogin(props: Partial<GoogleLoginProps>) {
  const signInWithGoogle = useSignInWithGoogle();

  const showError = useSnackbarError();

  async function handleSuccess(response: google.accounts.id.CredentialResponse) {
    if (await signInWithGoogle(response)) {
      props.onSuccess?.(response);
    } else {
      props.onError?.();
    }
  }

  function handleError() {
    showError('Sign in with Google unexpected empty response');
    props.onError?.();
  }

  return (
    <BaseGoogleLogin
      {...props}
      onSuccess={(res) => {
        void handleSuccess(res);
      }}
      onError={handleError}
    />
  );
}
