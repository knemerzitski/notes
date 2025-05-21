import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';

export function PrintLogApolloClient() {
  const client = useApolloClient();

  function handleClick() {
    console.log(client);
  }

  return <Button onClick={handleClick}>Log Apollo Client</Button>;
}
