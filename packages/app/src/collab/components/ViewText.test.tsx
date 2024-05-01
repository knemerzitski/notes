/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, beforeEach, expect } from 'vitest';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { createCache } from '../../test/helpers/apollo-client';
import ViewText from './ViewText';
import { render, screen } from '@testing-library/react';

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;

let collabTextId: string;

beforeEach(() => {
  cache = createCache();
  client = new ApolloClient({
    cache,
  });

  collabTextId = '1';
  const collabTextRef = cache.identify({
    id: collabTextId,
    __typename: 'CollabText',
  })!;

  cache.restore({
    [collabTextRef]: {
      __typename: 'CollabText',
      viewText: 'hi world',
    },
  });
});

it('displays viewText', () => {
  render(
    <ApolloProvider client={client}>
      <span>
        value: <ViewText collabTextId={collabTextId} />
      </span>
    </ApolloProvider>
  );
  expect(screen.getAllByText('value: hi world')).toBeDefined();
});
