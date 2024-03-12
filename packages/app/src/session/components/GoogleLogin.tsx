import { useSnackbarError } from '../../components/feedback/SnackbarAlertProvider';
import BaseGoogleLogin, { GoogleLoginProps } from '../auth/google/GoogleLogin';
import useSignInWithGoogle from '../hooks/useSignInWithGoogle';

export default function GoogleLogin(props: Partial<GoogleLoginProps>) {
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
