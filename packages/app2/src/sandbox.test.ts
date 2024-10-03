import { it } from 'vitest';
import { gql } from '@apollo/client';
import { logAll } from '~utils/log-all';
import { addSignedInUser, setCurrentSignedInUser } from './user/signed-in-user';
import { createDefaultGraphQLServiceParams } from './graphql';
import { createGraphQLService } from './graphql/service';
import { PersistLink } from './graphql/link/persist';

it('sandbox', async () => {
  const params = createDefaultGraphQLServiceParams();
  params.httpUri = 'http://localhost:4000/graphql';
  delete params.wsUrl;

  const service = createGraphQLService(params);

  const response = await service.apolloClient.client.mutate({
    mutation: gql(`
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
          ... on AlreadySignedInResult {
            signedInUser {
              id
            }
          }
          ... on JustSignedInResult {
            authProviderUser {
              id
            }
          }
        }
      }
    `),
    context: {
      [PersistLink.PERSIST]: true,
    },
    variables: {
      input: {
        auth: {
          google: {
            token: JSON.stringify({
              id: '1',
              name: 'Foo Bar',
              email: 'foo.bar@localhost.com',
            }),
          },
        },
      },
    },
    // optimisticResponse: {
    //   test: 'hi',
    //   optimistic: true,
    // },
  });

  addSignedInUser(response.data.signIn.signedInUser.id, service.apolloClient.client.cache);
  setCurrentSignedInUser(response.data.signIn.signedInUser.id, service.apolloClient.client.cache);
  console.log();
  console.log();
  console.log();
  logAll(service.apolloClient.cache.extract());
});
