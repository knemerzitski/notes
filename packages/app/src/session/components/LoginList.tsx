import { List, ListItem, ListProps } from '@mui/material';

import { SavedSession } from '../../__generated__/graphql';
import { useCloseable } from '../context/CloseableProvider';

import GoogleLogin from './GoogleLogin';

export interface LoginListProps extends ListProps {
  onSuccess?: () => void;
  onError?: () => void;
  /**
   * Hint which session is being logged into.
   */
  sessionHint?: SavedSession;
}

export default function LoginList({
  onSuccess,
  onError,
  sessionHint,
  ...restProps
}: LoginListProps) {
  const onClose = useCloseable();

  function handleSuccess() {
    onSuccess?.();
    onClose();
  }

  function handleError() {
    onError?.();
    onClose();
  }

  return (
    <List {...restProps}>
      <ListItem>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          idConfig={{
            login_hint: sessionHint?.authProviderId,
          }}
        />
      </ListItem>
    </List>
  );
}
