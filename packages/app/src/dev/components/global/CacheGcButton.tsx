import { Button } from '@mui/material';
import { useApolloClient } from '@apollo/client';
import { cacheGc } from '../../../graphql/utils/cache-gc';

// TODO doesn't block subscriptions data
export function CacheGcButton() {
  const client = useApolloClient();

  function handleClick() {
    cacheGc(client.cache);
  }

  return <Button onClick={handleClick}>Cache GC</Button>;
}
