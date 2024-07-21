import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { GraphQLResolversContext } from '../../../context';

const QUERY = `#graphql
query  {
  user {
    id
    profile {
      displayName
    }
  }
}
`;

it('returns error if not authenticated', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
    },
    {
      contextValue: {
        auth: undefined,
      } as unknown as GraphQLResolversContext,
    }
  );

  assert(response.body.kind === 'single');
  const { errors } = response.body.singleResult;
  expect(errors?.length).toStrictEqual(1);
  expect(errors?.[0]?.message).toEqual(expect.stringMatching(/.*not authorized.*/));
});

it('returns user displayName', async () => {
  const userId = new ObjectId(faker.database.mongodbObjectId());
  const displayName = faker.person.firstName();
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
    },
    {
      contextValue: {
        auth: {
          session: {
            user: {
              _id: userId,
              profile: {
                displayName: displayName,
              },
            },
          },
        },
      } as unknown as GraphQLResolversContext,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  expect(data).toEqual({
    user: {
      id: userId.toString('base64'),
      profile: {
        displayName,
      },
    },
  });
});
