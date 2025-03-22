import { ApolloCache, NormalizedCacheObject } from '@apollo/client';
import { it, beforeEach, expect } from 'vitest';

import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';

import { addUserOperations } from './add';

let cache: ApolloCache<NormalizedCacheObject>;
const userId = 'a';

beforeEach(() => {
  const params = createDefaultGraphQLServiceParams();
  const service = createGraphQLService(params);
  cache = service.client.cache;
});

it('adds operation', () => {
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

  expect(cache.extract()[`LocalUser:${userId}`]?.operations).toMatchInlineSnapshot(`
    {
      "someOpId": {
        "__typename": "DeleteNoteUserOperation",
        "id": "someOpId",
        "userNoteLink": {
          "__ref": "UserNoteLink:random",
        },
      },
    }
  `);
});
