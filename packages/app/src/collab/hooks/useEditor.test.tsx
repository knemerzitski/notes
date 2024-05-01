/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, beforeEach, describe } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { createCache } from '../../test/helpers/apollo-client';
import {
  FRAGMENT_READ_OPERATION,
  FRAGMENT_WRITE_OPERATION,
  useDeleteText,
  useInsertText,
} from './useEditor';

let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;
let collabTextId: string;
let collabTextRef: string;

function readFragmentWriteCollabText() {
  return cache.readFragment({
    id: collabTextRef,
    fragment: FRAGMENT_WRITE_OPERATION,
  });
}

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
});

describe('useInsertText', () => {
  describe('simple first entry', () => {
    beforeEach(() => {
      cache.writeFragment({
        id: collabTextRef,
        fragment: FRAGMENT_READ_OPERATION,
        data: {
          __typename: 'CollabText',
          headText: {
            changeset: ['saved[]saved'],
          },
          submittedRecord: null,
          localChanges: null,
          viewText: 'saved[]saved',
          activeSelection: {
            start: 6,
            end: null,
          },
          history: {
            serverIndex: -1,
            submittedIndex: -1,
            localIndex: -1,
            entries: [],
          },
        },
      });
    });

    it.each([['hello'], ['more longer text']])('%s', (text) => {
      const {
        result: { current: insertText },
      } = renderHook(() => useInsertText(collabTextId), {
        wrapper: ({ children }) => (
          <ApolloProvider client={client}>{children}</ApolloProvider>
        ),
      });

      insertText(text);

      expect(readFragmentWriteCollabText()).toEqual({
        __typename: 'CollabText',
        localChanges: [[0, 5], text, [6, 11]],
        viewText: `saved[${text}]saved`,
        activeSelection: { start: 6 + text.length, end: null },
        history: {
          serverIndex: -1,
          submittedIndex: -1,
          localIndex: 0,
          entries: [
            {
              execute: {
                changeset: [[0, 5], text, [6, 11]],
                selection: { start: 6 + text.length, end: null },
              },
              undo: {
                changeset: [
                  [0, 5],
                  [6 + text.length, 11 + text.length],
                ],
                selection: { start: 6, end: null },
              },
            },
          ],
        },
      });
    });
  });
  // TODO test delete entries if localIndex is less than length
});

describe('useDeleteText', () => {
  describe('simple first entry', () => {
    beforeEach(() => {
      cache.writeFragment({
        id: collabTextRef,
        fragment: FRAGMENT_READ_OPERATION,
        data: {
          __typename: 'CollabText',
          headText: {
            changeset: ['saved[]saved'],
          },
          submittedRecord: null,
          localChanges: null,
          viewText: 'saved[]saved',
          activeSelection: {
            start: 6,
            end: null,
          },
          history: {
            serverIndex: -1,
            submittedIndex: -1,
            localIndex: -1,
            entries: [],
          },
        },
      });
    });

    it.each([[2], [4]])('%s', (deleteCount) => {
      const {
        result: { current: deleteText },
      } = renderHook(() => useDeleteText(collabTextId), {
        wrapper: ({ children }) => (
          <ApolloProvider client={client}>{children}</ApolloProvider>
        ),
      });

      deleteText(deleteCount);

      expect(readFragmentWriteCollabText()).toEqual({
        __typename: 'CollabText',
        localChanges: [
          [0, 6 - deleteCount - 1],
          [6, 11],
        ],
        viewText: `${'saved['.slice(0, -deleteCount)}]saved`,
        activeSelection: { start: 6 - deleteCount, end: null },
        history: {
          serverIndex: -1,
          submittedIndex: -1,
          localIndex: 0,
          entries: [
            {
              execute: {
                changeset: [
                  [0, 6 - deleteCount - 1],
                  [6, 11],
                ],
                selection: { start: 6 - deleteCount, end: null },
              },
              undo: {
                changeset: [
                  [0, 6 - deleteCount - 1],
                  'saved['.slice(5 - deleteCount + 1),
                  [6 - deleteCount, 11 - deleteCount],
                ],
                selection: { start: 6, end: null },
              },
            },
          ],
        },
      });
    });
  });
});

// TODO test useHistoryMove
// TODO test useSetSelectionRange
