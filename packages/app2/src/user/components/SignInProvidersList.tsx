import { List, ListItem, ListProps } from '@mui/material';

import { SignedInUser } from '~/__generated__/graphql';
import { PickDeep } from '~utils/types';
import { gql } from '../../__generated__';
import { useUserId } from '../context/user-id';
import { useQuery } from '@apollo/client';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useOnClose } from '../../utils/context/on-close';

const SignInProvidersList_Query = gql(`
  query SignInProvidersList_Query($id: ID) {
    signedInUserById(id: $id) @client {
      id
      authProviderUser(type: GOOGLE) {
        id
      }
    }
  }
`);

export function SignInProvidersList({
  onSuccess,
  onError,
  ListProps,
}: {
  onSuccess?: () => void;
  onError?: () => void;
  /**
   * Hint which session is being logged into.
   */
  userHint?: PickDeep<
    SignedInUser,
    {
      __typename: 1;
      authProviderUsers: {
        id: 1;
      };
    }
  >;
  ListProps?: ListProps;
}) {
  const closeParent = useOnClose();

  const userIdHint = useUserId(true);
  const { data } = useQuery(SignInProvidersList_Query, {
    variables: {
      id: userIdHint,
    },
  });

  const login_hint = data?.signedInUserById?.authProviderUser?.id;

  function handleSuccess() {
    onSuccess?.();
    closeParent();
  }

  function handleError() {
    onError?.();
    closeParent();
  }

  return (
    <List {...ListProps}>
      <ListItem>
        <GoogleLoginButton
          onSuccess={handleSuccess}
          onError={handleError}
          idConfig={{
            login_hint,
          }}
        />
      </ListItem>
    </List>
  );
}
