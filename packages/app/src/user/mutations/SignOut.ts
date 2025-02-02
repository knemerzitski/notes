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
  (cache, result, { context }) => {
    const data = result.data;
    if (!data) return;

    removeUsers(data.signOut.signedOutUserIds, cache, context?.taggedEvict);
  }
);
