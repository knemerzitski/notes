import { List, ListItem, ListProps } from '@mui/material';

import { AuthProvider, ClientSession } from '../../__generated__/graphql';
import { useCloseable } from '../context/CloseableProvider';

import GoogleLogin from './GoogleLogin';

export interface LoginListProps extends ListProps {
  onSuccess?: () => void;
  onError?: () => void;
  /**
   * Hint which session is being logged into.
   */
  sessionHint?: ClientSession;
}

export default function LoginList({
  onSuccess,
  onError,
  sessionHint,
  ...restProps
}: LoginListProps) {
  const close = useCloseable();

  function handleSuccess() {
    onSuccess?.();
    close();
  }

  function handleError() {
    onError?.();
    close();
  }

  const googleEntry = sessionHint?.authProviderEntries.find(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (entry) => entry.provider === AuthProvider.Google
  );

  return (
    <List {...restProps}>
      <ListItem>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          idConfig={{
            login_hint: googleEntry?.id,
          }}
        />
      </ListItem>
    </List>
  );
}
