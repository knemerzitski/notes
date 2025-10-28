import { Button, styled } from '@mui/material';
import { useSignInDemoMutation } from '../hooks/useSignInDemoMutation';

interface DemoLoginButtonProps {
  demoUserId: string;
  text: string;
}

export function DemoLoginButton({ demoUserId, text }: DemoLoginButtonProps) {
  const signInDemo = useSignInDemoMutation();

  function handleClick() {
    void signInDemo(demoUserId);
  }

  return <Button onClick={handleClick} variant='contained' color='secondary'>{text}</Button>;
}

