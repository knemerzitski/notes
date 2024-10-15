import {
  GoogleLoginButton as ThirdPartyGoogleLoginButton,
  GoogleLoginProps,
} from '../../third-party/google/components/GoogleLoginButton';
import { useShowError } from '../../utils/context/show-error';
import { useSignInWithGoogleMutation } from '../hooks/useSignInWithGoogleMutation';

export function GoogleLoginButton(props: Partial<GoogleLoginProps>) {
  const signInWithGoogle = useSignInWithGoogleMutation();

  const showError = useShowError();

  function handleSuccess(response: google.accounts.id.CredentialResponse) {
    void signInWithGoogle(response).then((success) => {
      if (success) {
        props.onSuccess?.(response);
      } else {
        props.onError?.();
      }
    });
  }

  function handleError() {
    showError('Sign in with Google unexpected error');
    props.onError?.();
  }

  return (
    <ThirdPartyGoogleLoginButton {...props} onSuccess={handleSuccess} onError={handleError} />
  );
}
