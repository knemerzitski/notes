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

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;

const handleNextFn = vi.fn();

beforeEach(() => {
  cache = new InMemoryCache();
  client = new ApolloClient({
    cache,
  });

  cache.restore({
    'CollabText:1': {
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

it('calls onNext with initial localChanges', async () => {
  await waitFor(() => {
    expect(handleNextFn).toHaveBeenLastCalledWith(['initial change']);
  });
});

it('calls onNext after localChanges has been modified', async () => {
  client.writeFragment({
    id: 'CollabText:1',
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
    expect(handleNextFn).toHaveBeenLastCalledWith(['new text']);
  });
});
