/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { WaitLink } from './wait';
import { it, expect } from 'vitest';

const Query = gql(`
  query Foo {
    foo {
      bar
    }
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: Query,
    },
    result: {
      data: {
        foo: {
          bar: 'foobar',
        },
      },
    },
  },
];

it('delays the request', async () => {
  const mockLink = new MockLink(mocks);
  const waitLink = new WaitLink({
    waitTime: 30,
  });

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: waitLink.concat(mockLink),
  });

  const startTime = Date.now();
  await client.query({
    query: Query,
  });

  const elapsedTime = Date.now() - startTime;

  expect(elapsedTime, 'WaitLink did not throttle the request').greaterThanOrEqual(30);
});
