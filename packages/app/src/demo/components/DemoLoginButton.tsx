import { Button, styled } from '@mui/material';
import { useSignInDemoMutation } from '../hooks/useSignInDemoMutation';

interface DemoLoginButtonProps {
  demoUserId: string;
  text: string;
  onSuccess?: () => void;
  onError?: () => void;
}

export function DemoLoginButton({
  demoUserId,
  text,
  onSuccess,
  onError,
}: DemoLoginButtonProps) {
  const signInDemo = useSignInDemoMutation();

  function handleClick() {
    void signInDemo(demoUserId).then((success) => {
      if (success) {
        onSuccess?.();
      } else {
        onError?.();
      }
    });
  }

  return (
    <Button onClick={handleClick} variant="contained" color="secondary">
      {text}
    </Button>
  );
}
