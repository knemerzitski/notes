/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import LocalChangesWatcher from './LocalChangesWatcher';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { gql } from '../../../__generated__';
import { createCache } from '../../../test/helpers/apollo-client';

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;

const handleNextFn = vi.fn();

let collabTextId: string | undefined;

beforeEach(() => {
  cache = createCache();
  client = new ApolloClient({
    cache,
  });

  collabTextId = cache.identify({
    id: '1',
    __typename: 'CollabText',
  })!;

  cache.restore({
    [collabTextId]: {
      __typename: 'CollabText',
      localChanges: ['initial change'],
    },
  });

  handleNextFn.mockClear();

  render(
    <ApolloProvider client={client}>
      <LocalChangesWatcher collabTextId="1" onNext={handleNextFn} />
    </ApolloProvider>
  );
});

it('calls onNext with initial value', async () => {
  await waitFor(() => {
    expect(handleNextFn).toHaveBeenCalledOnce();
  });
});

it('calls onNext after writeFragment', async () => {
  client.writeFragment({
    id: collabTextId,
    fragment: gql(`
      fragment TestLocalChangesWatcher on CollabText {
        localChanges
      }
    `),
    data: {
      localChanges: ['new text'],
    },
  });

  await waitFor(() => {
    expect(handleNextFn).toHaveBeenCalledTimes(2);
  });
});
