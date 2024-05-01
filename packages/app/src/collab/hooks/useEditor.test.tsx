/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, beforeEach, describe, assert } from 'vitest';
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
  useHistoryMove,
  useInsertText,
  useSetSelectionRange,
} from './useEditor';
import prettyLog from '~utils/prettyLog';
import { UseEditorReadFragment } from '../../__generated__/graphql';

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

  describe('multiple history entries', () => {
    function createEntry(): UseEditorReadFragment['history']['entries'][0] {
      return {
        execute: {
          changeset: [],
          selection: {
            start: 0,
            end: null,
          },
        },
        undo: {
          changeset: [],
          selection: {
            start: 0,
            end: null,
          },
        },
      };
    }

    interface WriteFragmentOptions {
      serverIndex?: number;
      submittedIndex?: number;
      localIndex?: number;
    }

    function writeFragment(options?: WriteFragmentOptions) {
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
            serverIndex: options?.serverIndex ?? -1,
            submittedIndex: options?.submittedIndex ?? -1,
            localIndex: options?.localIndex ?? 2,
            entries: [...new Array<undefined>(10)].map(() => createEntry()),
          },
        },
      });
    }

    it('deletes entries past localIndex', () => {
      writeFragment();

      const {
        result: { current: insertText },
      } = renderHook(() => useInsertText(collabTextId), {
        wrapper: ({ children }) => (
          <ApolloProvider client={client}>{children}</ApolloProvider>
        ),
      });

      insertText('a');

      expect(readFragmentWriteCollabText()?.history.entries).toHaveLength(4);
      expect(readFragmentWriteCollabText()?.history.localIndex).toStrictEqual(3);
    });

    it('it caps server and submitted index', () => {
      writeFragment({
        serverIndex: 6,
        submittedIndex: 8,
        localIndex: 4,
      });

      const {
        result: { current: insertText },
      } = renderHook(() => useInsertText(collabTextId), {
        wrapper: ({ children }) => (
          <ApolloProvider client={client}>{children}</ApolloProvider>
        ),
      });

      insertText('a');

      const history = readFragmentWriteCollabText()?.history;

      expect(history?.entries).toHaveLength(6);
      expect(history?.serverIndex).toStrictEqual(4);
      expect(history?.submittedIndex).toStrictEqual(4);
      expect(history?.localIndex).toStrictEqual(5);
    });
  });
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

describe('useHistoryMove', () => {
  function readViewText() {
    return readFragmentWriteCollabText()!.viewText;
  }

  beforeEach(() => {
    const {
      result: { current: insertText },
    } = renderHook(() => useInsertText(collabTextId), {
      wrapper: ({ children }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    });

    cache.writeFragment({
      id: collabTextRef,
      fragment: FRAGMENT_READ_OPERATION,
      data: {
        __typename: 'CollabText',
        headText: {
          changeset: ['start[]end'],
        },
        submittedRecord: null,
        localChanges: null,
        viewText: 'start[]end',
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

    insertText('1');
    insertText('2');
    insertText('3');
  });

  it('uses correct history entries and no overflow', () => {
    const {
      result: { current: redo },
    } = renderHook(() => useHistoryMove(collabTextId, 'execute'), {
      wrapper: ({ children }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    });
    const {
      result: { current: undo },
    } = renderHook(() => useHistoryMove(collabTextId, 'undo'), {
      wrapper: ({ children }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    });

    expect(readViewText()).toStrictEqual('start[123]end');
    redo();
    expect(readViewText()).toStrictEqual('start[123]end');
    undo();
    expect(readViewText()).toStrictEqual('start[12]end');
    undo();
    expect(readViewText()).toStrictEqual('start[1]end');
    undo();
    expect(readViewText()).toStrictEqual('start[]end');
    undo();
    expect(readViewText()).toStrictEqual('start[]end');
    redo();
    expect(readViewText()).toStrictEqual('start[1]end');
    redo();
    expect(readViewText()).toStrictEqual('start[12]end');
    redo();
    expect(readViewText()).toStrictEqual('start[123]end');
    redo();
    expect(readViewText()).toStrictEqual('start[123]end');
  });
});

describe('useSetSelectionRange', () => {
  beforeEach(() => {
    cache.writeFragment({
      id: collabTextRef,
      fragment: FRAGMENT_READ_OPERATION,
      data: {
        __typename: 'CollabText',
        headText: {
          changeset: ['simple text'],
        },
        submittedRecord: null,
        localChanges: null,
        viewText: 'simple text',
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

  it.each([
    [{ input: { start: 2, end: null }, expected: { start: 2, end: null } }],
    [{ input: { start: 13, end: 15 }, expected: { start: 11, end: null } }],
    [{ input: { start: 0, end: 4 }, expected: { start: 0, end: 4 } }],
  ])('%s => %s', ({ input, expected }) => {
    const {
      result: { current: setSelectionRange },
    } = renderHook(() => useSetSelectionRange(collabTextId), {
      wrapper: ({ children }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    });

    setSelectionRange(input.start, input.end);

    expect(readFragmentWriteCollabText()?.activeSelection).toEqual(expected);
  });
});
