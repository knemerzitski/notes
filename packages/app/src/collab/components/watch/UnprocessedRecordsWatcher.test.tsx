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
    id: 'CollabText:1',
    fragment: gql(`
      fragment TestUnprocessedRecordsWatcher on CollabText {
        unprocessedRecords {
          done
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
          done: null,
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

import util from 'util';
import { CollabTextUnprocessedRecordType } from '../../../__generated__/graphql';
