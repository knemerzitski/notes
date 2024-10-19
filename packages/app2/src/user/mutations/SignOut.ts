import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { removeUsers } from '../utils/signed-in-user/remove';

export const SignOut = mutationDefinition(
  gql(`
    mutation SignOut($input: SignOutInput!) @noauth {
      signOut(input: $input) {
        signedOutUserIds
      }
    }
  `),
  (cache, result) => {
    const data = result.data;
    if (!data) return;

    removeUsers(data.signOut.signedOutUserIds, cache);
  }
);
