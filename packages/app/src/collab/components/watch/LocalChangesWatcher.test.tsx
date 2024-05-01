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
let collabTextRef: string | undefined;

beforeEach(() => {
  cache = createCache();
  client = new ApolloClient({
    cache,
  });

  collabTextId = '1',
  collabTextRef = cache.identify({
    id: collabTextId,
    __typename: 'CollabText',
  })!;

  cache.restore({
    [collabTextRef]: {
      __typename: 'CollabText',
      localChanges: ['initial change'],
    },
  });

  handleNextFn.mockClear();

  render(
    <ApolloProvider client={client}>
      <LocalChangesWatcher collabTextId={collabTextId} onNext={handleNextFn} />
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
    id: collabTextRef,
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
