import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  AddUserAuthProviderUserFragmentFragment,
  User,
} from '../../../__generated__/graphql';

const AddUserAuthProvider_UserFragment = gql(`
  fragment AddUserAuthProvider_UserFragment on User {
    id
    authProviderUsers {
      id
      email
    }
  }
`);

export function addUserAuthProvider(
  userId: User['id'],
  authProvider: AddUserAuthProviderUserFragmentFragment['authProviderUsers'][0],
  cache: ApolloCache<unknown>
) {
  cache.writeFragment({
    fragment: AddUserAuthProvider_UserFragment,
    id: cache.identify({
      __typename: 'User',
      id: userId,
    }),
    data: {
      __typename: 'User',
      id: userId,
      authProviderUsers: [authProvider],
    },
  });
}
