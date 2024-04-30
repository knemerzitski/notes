import { it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { gql } from '../../../__generated__';
import SubmittedRecordWatcher from './SubmittedRecordWatcher';
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
  });

  cache.restore({
    'CollabText:1': {
      __typename: 'CollabText',
      submittedRecord: {
        generatedId: 'a',
        change: null,
        beforeSelection: null,
        afterSelection: null,
      },
    },
  });

  handleNextFn.mockClear();

  render(
    <ApolloProvider client={client}>
      <SubmittedRecordWatcher collabTextId="1" onNext={handleNextFn} />
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
      fragment TestSubmittedRecordWatcher on CollabText {
        submittedRecord {
          generatedId
        }
      }
    `),
    data: {
      submittedRecord: null,
    },
  });

  await waitFor(() => {
    expect(handleNextFn).toHaveBeenCalledTimes(2);
  });
});