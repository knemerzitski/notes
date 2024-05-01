/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { createCache } from '../../test/helpers/apollo-client';
import LocalChangesToSubmittedRecordDebounced, {
  FRAGMENT_WRITE,
} from './LocalChangesToSubmittedRecordDebounced';
import nextTick from '~utils/nextTick';
import { gql } from '../../__generated__/gql';

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;
let collabTextId: string;
let collabTextRef: string;

beforeEach(() => {
  cache = createCache();
  client = new ApolloClient({
    cache,
  });

  collabTextId = '1';
  collabTextRef = cache.identify({
    id: collabTextId,
    __typename: 'CollabText',
  })!;

  render(
    <ApolloProvider client={client}>
      <LocalChangesToSubmittedRecordDebounced collabTextId={collabTextId} wait={0} />
    </ApolloProvider>
  );
});

function populate() {
  cache.writeFragment({
    id: collabTextRef,
    fragment: gql(`
      fragment TestLocalChangesWriteState on CollabText {
        headText {
          revision
        }
        localChanges
        viewText
        activeSelection {
          start
          end
        }
        history {
          serverIndex
          submittedIndex
          localIndex
          entries {
            execute {
              changeset
              selection {
                start
                end
              }
            }
            undo {
              changeset
              selection {
                start
                end
              }
            }
          }
        }
      }
    `),
    data: {
      __typename: 'CollabText',
      headText: {
        revision: 12,
      },
      localChanges: [[0, 5], 'a', [6, 11]],
      viewText: `saved[a]saved`,
      activeSelection: { start: 7, end: null },
      history: {
        serverIndex: -1,
        submittedIndex: -1,
        localIndex: 0,
        entries: [
          {
            execute: {
              changeset: [[0, 5], 'a', [6, 11]],
              selection: { start: 7, end: null },
            },
            undo: {
              changeset: [
                [0, 5],
                [7, 12],
              ],
              selection: { start: 6, end: null },
            },
          },
        ],
      },
    },
  });
}

it('writes localChanges to submittedRecord', async () => {
  populate();

  await nextTick();

  const collabText = cache.readFragment({
    id: collabTextRef,
    fragment: FRAGMENT_WRITE,
  });

  expect(collabText).toStrictEqual({
    __typename: 'CollabText',
    localChanges: null,
    submittedRecord: {
      generatedId: expect.any(String),
      change: { revision: 12, changeset: [[0, 5], 'a', [6, 11]] },
      beforeSelection: { start: 6, end: null },
      afterSelection: { start: 7, end: null },
    },
  });
});
