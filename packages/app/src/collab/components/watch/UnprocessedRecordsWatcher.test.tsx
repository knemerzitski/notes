/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { gql } from '../../../__generated__';
import UnprocessedRecordsWatcher from './UnprocessedRecordsWatcher';
import { CollabTextUnprocessedRecordType } from '../../../__generated__/graphql';
import { createCache } from '../../../test/helpers/apollo-client';

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;

const handleNextFn = vi.fn();

let collabTextId: string;

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
      unprocessedRecords: [],
    },
  });

  handleNextFn.mockClear();

  render(
    <ApolloProvider client={client}>
      <UnprocessedRecordsWatcher collabTextId="1" onNext={handleNextFn} />
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
      fragment TestUnprocessedRecordsWatcher on CollabText {
        unprocessedRecords {
          type
          record {
            id
            change {
              revision
              changeset
            }
            beforeSelection {
              start
              end
            }
            afterSelection {
              start
              end
            }
          }
        }
      }
    `),
    data: {
      unprocessedRecords: [
        {
          type: CollabTextUnprocessedRecordType.SubmittedAcknowleged,
          record: {
            id: 'hi',
            change: {
              changeset: [],
              revision: 0,
            },
            beforeSelection: {
              start: 0,
              end: null,
            },
            afterSelection: {
              start: 0,
              end: null,
            },
          },
        },
      ],
    },
  });

  await waitFor(() => {
    expect(handleNextFn).toHaveBeenCalledTimes(2);
  });
});
