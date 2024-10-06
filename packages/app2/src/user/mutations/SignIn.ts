import { gql } from '../../__generated__';
import { createMutationOperation } from '../../graphql/utils/create-mutation-operation';

export const SIGN_IN = createMutationOperation(
  gql(`
  mutation SignIn($input: SignInInput!) @serialize(key: ["hi", true]) {
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
`)
);
