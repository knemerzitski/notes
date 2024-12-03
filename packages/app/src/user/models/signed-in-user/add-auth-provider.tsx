import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  AddUserAuthProviderSignedInUserFragmentFragment,
  SignedInUser,
} from '../../../__generated__/graphql';

const AddUserAuthProvider_SignedInUserFragment = gql(`
  fragment AddUserAuthProvider_SignedInUserFragment on SignedInUser {
    id
    authProviderUsers {
      id
      email
    }
  }
`);

export function addUserAuthProvider(
  userId: SignedInUser['id'],
  authProvider: AddUserAuthProviderSignedInUserFragmentFragment['authProviderUsers'][0],
  cache: ApolloCache<unknown>
) {
  cache.writeFragment({
    fragment: AddUserAuthProvider_SignedInUserFragment,
    id: cache.identify({
      __typename: 'SignedInUser',
      id: userId,
    }),
    data: {
      __typename: 'SignedInUser',
      authProviderUsers: [authProvider],
    },
  });
}
