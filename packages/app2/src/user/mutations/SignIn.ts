import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { addUser } from '../utils/signed-in-user/add';
import { addUserAuthProvider } from '../utils/signed-in-user/add-auth-provider';

export const SignIn = mutationDefinition(
  gql(`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      __typename
      ... on SignInResult {
        signedInUser {
          id
          public {
            id
            profile {
              displayName
            }
          }
        }
      }
      ... on JustSignedInResult {
        authProviderUser {
          id
          email
        }
      }
    }
  }
`),
  (cache, result) => {
    const data = result.data;
    if (!data) return;

    if (data.signIn.__typename === 'JustSignedInResult') {
      addUserAuthProvider(
        data.signIn.signedInUser.id,
        data.signIn.authProviderUser,
        cache
      );
    }

    addUser(data.signIn.signedInUser.id, cache);
  }
);
