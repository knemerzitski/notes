import { useQuery } from '@apollo/client';
import { List, ListItem, ListProps } from '@mui/material';

import { PickDeep } from '../../../../utils/src/types';

import { gql } from '../../__generated__';
import { User } from '../../__generated__/graphql';

import { useOnClose } from '../../utils/context/on-close';
import { useUserId } from '../context/user-id';

import { GoogleLoginButton } from './GoogleLoginButton';
import { DemoLoginItems } from '../../demo/components/DemoLoginItems';

const SignInProvidersList_Query = gql(`
  query SignInProvidersList_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
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
    User,
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: userIdHint!,
    },
    fetchPolicy: 'cache-only',
  });

  const login_hint = data?.signedInUser.authProviderUser?.id;

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
      <DemoLoginItems onSuccess={handleSuccess} onError={handleError} />
    </List>
  );
}
