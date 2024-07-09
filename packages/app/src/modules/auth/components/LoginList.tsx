import { List, ListItem, ListProps } from '@mui/material';

import { AuthProvider, User } from '../../../__generated__/graphql';
import { useCloseable } from '../context/CloseableProvider';

import GoogleLogin from './GoogleLogin';

export interface LoginListProps extends ListProps {
  onSuccess?: () => void;
  onError?: () => void;
  /**
   * Hint which session is being logged into.
   */
  userHint?: Pick<User, 'authProviderEntries'>;
}

export default function LoginList({
  onSuccess,
  onError,
  userHint,
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

  const googleEntry = userHint?.authProviderEntries.find(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (entry) => entry.provider === AuthProvider.GOOGLE
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
