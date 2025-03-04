/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, expect } from 'vitest';

import { Changeset as CollabChangeset } from '../../../../collab/src/changeset';

import { Changeset } from './Changeset';

const QUERY = gql`
  query {
    changesetQuery {
      changeset
    }
  }
`;

it('returns a changeset instance and serializes on extract', async () => {
  const mockLink = new MockLink([
    {
      request: {
        query: QUERY,
      },
      result: {
        data: {
          __typename: 'Query',
          changesetQuery: {
            __typename: 'ChangesetType',
            changeset: CollabChangeset.fromInsertion('a').serialize(),
          },
        },
      },
    },
  ]);

  const cache = new InMemoryCache({
    typePolicies: {
      ChangesetType: {
        fields: {
          changeset: Changeset,
        },
      },
    },
  });

  const client = new ApolloClient({
    cache,
    link: mockLink,
  });

  const { data } = await client.query({
    query: QUERY,
  });

  expect(data.changesetQuery.changeset).toBeInstanceOf(CollabChangeset);
  expect(data.changesetQuery.changeset).toEqual(CollabChangeset.fromInsertion('a'));

  expect(cache.extract()).toMatchInlineSnapshot(`
    {
      "ROOT_QUERY": {
        "__typename": "Query",
        "changesetQuery": {
          "__typename": "ChangesetType",
          "changeset": [
            "a",
          ],
        },
      },
    }
  `);
});
