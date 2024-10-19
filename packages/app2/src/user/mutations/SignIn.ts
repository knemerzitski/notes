import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { addUser } from '../models/signed-in-user/add';
import { addUserAuthProvider } from '../models/signed-in-user/add-auth-provider';

export const SignIn = mutationDefinition(
  gql(`
  mutation SignIn($input: SignInInput!) @noauth {
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
  (cache, result, { context }) => {
    const data = result.data;
    if (!data) return;

    const userId = data.signIn.signedInUser.id;

    if (data.signIn.__typename === 'JustSignedInResult') {
      addUserAuthProvider(userId, data.signIn.authProviderUser, cache);
    }

    addUser(userId, cache);

    // Enable sending user specific requests to the server
    if (context?.getUserGate) {
      const gate = context.getUserGate(userId);
      gate.open();
    }
  }
);
