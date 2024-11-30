import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { it, expect } from 'vitest';
import { MockLink } from '@apollo/client/testing';
import { Changeset } from './Changeset';
import { Changeset as CollabChangeset } from '~collab/changeset';

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
