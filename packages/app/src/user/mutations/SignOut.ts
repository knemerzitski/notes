import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { removeUsers } from '../models/signed-in-user/remove';

export const SignOut = mutationDefinition(
  gql(`
    mutation SignOut($input: SignOutInput!) @remote {
      signOut(input: $input) {
        signedOutUserIds
      }
    }
  `),
  (cache, result, { context, variables }) => {
    const data = result.data;
    if (!data) return;

    if (data.signOut.signedOutUserIds.length === 0 && variables?.input.allUsers) {
      // Requested to sign out all users but server signed out no users
      // Most likely cookies has no sessions stored. Must clear all cached users.
      removeUsers(null, cache, context?.taggedEvict);
    } else {
      removeUsers(data.signOut.signedOutUserIds, cache, context?.taggedEvict);
    }
  }
);
