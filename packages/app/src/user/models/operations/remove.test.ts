import { ApolloCache, NormalizedCacheObject } from '@apollo/client';
import { it, beforeEach, expect } from 'vitest';

import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';

import { addUserOperations } from './add';
import { removeUserOperations } from './remove';

let cache: ApolloCache<NormalizedCacheObject>;
const userId = 'a';

beforeEach(() => {
  const params = createDefaultGraphQLServiceParams();
  const service = createGraphQLService(params);
  cache = service.client.cache;
});

it('removes operation', () => {
  addUserOperations(
    userId,
    [
      {
        __typename: 'DeleteNoteUserOperation',
        id: 'someOpId',
        userNoteLink: {
          __typename: 'UserNoteLink',
          id: 'random',
        },
      },
    ],
    cache
  );
  removeUserOperations(userId, ['someOpId'], cache);

  expect(
    cache.extract()[`LocalUser:${userId}`]?.operations
  ).toMatchInlineSnapshot(`{}`);
});
