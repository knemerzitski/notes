import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { it, expect } from 'vitest';
import { DateTime } from './DateTime';
import { MockLink } from '@apollo/client/testing';

const QUERY = gql`
  query {
    dateQuery {
      date
    }
  }
`;

it('returns a date instance and serializes to a string', async () => {
  const mockLink = new MockLink([
    {
      request: {
        query: QUERY,
      },
      result: {
        data: {
          __typename: 'Query',
          dateQuery: {
            __typename: 'DateType',
            date: new Date(100).toJSON(),
          },
        },
      },
    },
  ]);

  const cache = new InMemoryCache({
    typePolicies: {
      DateType: {
        fields: {
          date: DateTime,
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

  expect(data.dateQuery.date).toBeInstanceOf(Date);
  expect(data.dateQuery.date).toEqual(new Date(100));

  expect(cache.extract()).toMatchInlineSnapshot(`
    {
      "ROOT_QUERY": {
        "__typename": "Query",
        "dateQuery": {
          "__typename": "DateType",
          "date": 1970-01-01T00:00:00.100Z,
        },
      },
    }
  `);
});
