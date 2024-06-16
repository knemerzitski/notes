import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';
import useSignInWithGoogle from '../hooks/useSignInWithGoogle';
import BaseGoogleLogin, { GoogleLoginProps } from '../third-party/google/GoogleLogin';

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
