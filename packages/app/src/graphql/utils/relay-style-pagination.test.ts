/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  StoreObject,
  FieldFunctionOptions,
  isReference,
  InMemoryCache,
  makeReference,
  Reference,
} from '@apollo/client';
import { relayStylePagination, TRelayPageInfo } from './relay-style-pagination';
import { describe, it, expect } from 'vitest';

describe('copied tests from @apollo/client/utilities/policies/pagination', () => {
  describe('relayStylePagination', () => {
    const policy = relayStylePagination();

    describe('read', () => {
      const fakeEdges = [
        { node: { __ref: 'A' }, cursor: 'cursorA' },
        { node: { __ref: 'B' }, cursor: 'cursorB' },
        { node: { __ref: 'C' }, cursor: 'cursorC' },
      ];

      const fakeReadOptions = {
        canRead() {
          return true;
        },
        readField(key: string, obj: StoreObject | undefined) {
          return obj && obj[key];
        },
      } as any as FieldFunctionOptions;

      it('should prefer existing.pageInfo.startCursor', () => {
        const resultWithStartCursor = policy.read!(
          {
            edges: fakeEdges,
            pageInfo: {
              startCursor: 'preferredStartCursor',
              hasPreviousPage: false,
              hasNextPage: true,
            } as TRelayPageInfo,
          },
          fakeReadOptions
        );

        expect(resultWithStartCursor && resultWithStartCursor.pageInfo).toEqual({
          startCursor: 'preferredStartCursor',
          endCursor: 'cursorC',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });

      it('should prefer existing.pageInfo.endCursor', () => {
        const resultWithEndCursor = policy.read!(
          {
            edges: fakeEdges,
            pageInfo: {
              endCursor: 'preferredEndCursor',
              hasPreviousPage: false,
              hasNextPage: true,
            } as TRelayPageInfo,
          },
          fakeReadOptions
        );

        expect(resultWithEndCursor && resultWithEndCursor.pageInfo).toEqual({
          startCursor: 'cursorA',
          endCursor: 'preferredEndCursor',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });

      it('should prefer existing.pageInfo.{start,end}Cursor', () => {
        const resultWithEndCursor = policy.read!(
          {
            edges: fakeEdges,
            pageInfo: {
              startCursor: 'preferredStartCursor',
              endCursor: 'preferredEndCursor',
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
          fakeReadOptions
        );

        expect(resultWithEndCursor && resultWithEndCursor.pageInfo).toEqual({
          startCursor: 'preferredStartCursor',
          endCursor: 'preferredEndCursor',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });

      it('should override pageInfo.{start,end}Cursor if empty strings', () => {
        const resultWithEndCursor = policy.read!(
          {
            edges: [
              { node: { __ref: 'A' }, cursor: '' },
              { node: { __ref: 'B' }, cursor: 'cursorB' },
              { node: { __ref: 'C' }, cursor: '' },
              { node: { __ref: 'D' }, cursor: 'cursorD' },
              { node: { __ref: 'E' } },
            ],
            pageInfo: {
              startCursor: '',
              endCursor: '',
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
          fakeReadOptions
        );

        expect(resultWithEndCursor && resultWithEndCursor.pageInfo).toEqual({
          startCursor: 'cursorB',
          endCursor: 'cursorD',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });

      it('should only override pageInfo.endCursor if empty strings with a single cursor', () => {
        const resultWithEndCursor = policy.read!(
          {
            edges: [
              { node: { __ref: 'A' }, cursor: '' },
              { node: { __ref: 'B' }, cursor: '' },
              { node: { __ref: 'C' }, cursor: '' },
              { node: { __ref: 'D' }, cursor: 'cursorD' },
              { node: { __ref: 'E' } },
            ],
            pageInfo: {
              startCursor: '',
              endCursor: '',
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
          fakeReadOptions
        );

        expect(resultWithEndCursor && resultWithEndCursor.pageInfo).toEqual({
          startCursor: null,
          endCursor: 'cursorD',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });

      it('should only override both pageInfo.{start,end}Cursor if empty strings with a single cursor and single element', () => {
        const resultWithEndCursor = policy.read!(
          {
            edges: [{ node: { __ref: 'A' }, cursor: 'cursorA' }],
            pageInfo: {
              startCursor: '',
              endCursor: '',
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
          fakeReadOptions
        );

        expect(resultWithEndCursor && resultWithEndCursor.pageInfo).toEqual({
          startCursor: 'cursorA',
          endCursor: 'cursorA',
          hasPreviousPage: false,
          hasNextPage: true,
        });
      });
    });

    describe('merge', () => {
      const merge = policy.merge;
      // The merge function should exist, make TS aware
      if (typeof merge !== 'function') {
        throw new Error('Expecting merge function');
      }

      const options: FieldFunctionOptions = {
        args: null,
        fieldName: 'fake',
        storeFieldName: 'fake',
        field: null,
        isReference: isReference,
        toReference: () => undefined,
        storage: {},
        cache: new InMemoryCache(),
        readField: () => undefined,
        canRead: () => false,
        mergeObjects: (existing, _incoming) => existing,
      };

      it('should maintain endCursor and startCursor with empty edges', () => {
        const incoming: Parameters<typeof merge>[1] = {
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'abc',
            endCursor: 'xyz',
          },
        };
        const result = merge(undefined, incoming, options);
        expect(result).toEqual({
          edges: [],
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'abc',
            endCursor: 'xyz',
          },
        });
      });

      it('should maintain existing PageInfo when adding a page', () => {
        const existingEdges = [{ cursor: 'alpha', node: makeReference('fakeAlpha') }];

        const incomingEdges = [{ cursor: 'omega', node: makeReference('fakeOmega') }];

        const result = merge(
          {
            edges: existingEdges,
            pageInfo: {
              hasPreviousPage: false,
              hasNextPage: true,
              startCursor: 'alpha',
              endCursor: 'alpha',
            },
          },
          {
            edges: incomingEdges,
            pageInfo: {
              hasPreviousPage: true,
              hasNextPage: true,
              startCursor: incomingEdges[0]!.cursor,
              endCursor: incomingEdges[incomingEdges.length - 1]!.cursor,
            },
          },
          {
            ...options,
            args: {
              after: 'alpha',
            },
          }
        );

        expect(result).toEqual({
          edges: [...existingEdges, ...incomingEdges],
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'alpha',
            endCursor: 'omega',
          },
        });
      });

      it('should preserve existing if incoming is null', () => {
        const existingEdges = [{ cursor: 'alpha', node: makeReference('fakeAlpha') }];

        const fakeExisting = {
          edges: existingEdges,
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'alpha',
            endCursor: 'alpha',
          },
        };

        const fakeIncoming = null;

        const fakeOptions = {
          ...options,
          args: {
            after: 'alpha',
          },
        };

        const result = merge(fakeExisting, fakeIncoming, fakeOptions);

        expect(result).toEqual(fakeExisting);
      });

      it('should replace existing null with incoming', () => {
        const incomingEdges = [{ cursor: 'alpha', node: makeReference('fakeAlpha') }];
        const incoming = {
          edges: incomingEdges,
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'alpha',
            endCursor: 'alpha',
          },
        };
        const result = merge(null, incoming, {
          ...options,
          args: {
            after: 'alpha',
          },
        });

        expect(result).toEqual(incoming);
      });

      it('should maintain extra PageInfo properties', () => {
        const existingEdges = [{ cursor: 'alpha', node: makeReference('fakeAlpha') }];

        const incomingEdges = [{ cursor: 'omega', node: makeReference('fakeOmega') }];

        const result = merge(
          {
            edges: existingEdges,
            pageInfo: {
              hasPreviousPage: false,
              hasNextPage: true,
              startCursor: 'alpha',
              endCursor: 'alpha',
              extra: 'existing.pageInfo.extra',
            } as TRelayPageInfo,
          },
          {
            edges: incomingEdges,
            pageInfo: {
              hasPreviousPage: true,
              hasNextPage: true,
              startCursor: incomingEdges[0]!.cursor,
              endCursor: incomingEdges[incomingEdges.length - 1]!.cursor,
              extra: 'incoming.pageInfo.extra',
            } as TRelayPageInfo,
          },
          {
            ...options,
            args: {
              after: 'alpha',
            },
          }
        );

        expect(result).toEqual({
          edges: [...existingEdges, ...incomingEdges],
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: 'alpha',
            endCursor: 'omega',
            // This is the most important line in this test, since it proves
            // incoming.pageInfo.extra was not lost.
            extra: 'incoming.pageInfo.extra',
          },
        });
      });
    });
  });
});

describe('preserveEdge', () => {
  const policy = relayStylePagination(false, {
    preserveEdge(edge, { readField }) {
      const node = readField<Reference>('node', edge);
      if (!node) {
        return false;
      }

      // Preserve string ids
      const id = readField<string | number>('id', node);
      return typeof id == 'string';
    },
  });

  const merge = policy.merge;
  // The merge function should exist, make TS aware
  if (typeof merge !== 'function') {
    throw new Error('Expecting merge function');
  }

  const options: FieldFunctionOptions = {
    args: null,
    fieldName: 'fake',
    storeFieldName: 'fake',
    field: null,
    isReference: isReference,
    toReference: () => undefined,
    storage: {},
    cache: new InMemoryCache(),
    //@ts-expect-error Works for testing
    readField: (field, obj) => {
      //@ts-expect-error Works for testing
      return obj[field];
    },
    canRead: () => false,
    mergeObjects: (existing, _incoming) => existing,
  };

  function createEdges(ids: (string | number)[]) {
    return ids.map((id) =>
      typeof id === 'number'
        ? { cursor: String(id), node: { id, __ref: `N:${id}` } }
        : { node: { id, __ref: `N:${id}` } }
    );
  }

  it.each([
    [[1, 2, 'A', 3, 'B', 4], [2, 1, 4, 3], [2, 1, 'A', 4, 'B', 3], {}],
    [
      [1, 'A', 2, 3, 'B', 4],
      [4, 'C', 3],
      [1, 'A', 2, 4, 'B', 'C', 3],
      {
        after: '2',
      },
    ],
    [
      [1, 'A', 2, 3, 'B', 4],
      [2, 'C', 1],
      [2, 'A', 'C', 1, 3, 'B', 4],
      {
        before: '3',
      },
    ],
  ])('%s + %s => %s', (existingDesc, incomingDesc, expectedResultDesc, args) => {
    const existingEdges = createEdges(existingDesc);
    const incomingEdges = createEdges(incomingDesc);

    const result = merge(
      {
        edges: existingEdges,
      } as any,
      {
        edges: incomingEdges,
      },
      {
        ...options,
        args,
      }
    );

    const resultEdges = result?.edges.map((edge: any) => edge.node.id);
    expect(resultEdges).toStrictEqual(expectedResultDesc);
  });
});

describe('isOrderedSet', () => {
  const policy = relayStylePagination(false, {
    isOrderedSet: true,
  });

  const merge = policy.merge;
  // The merge function should exist, make TS aware
  if (typeof merge !== 'function') {
    throw new Error('Expecting merge function');
  }

  const options: FieldFunctionOptions = {
    args: null,
    fieldName: 'fake',
    storeFieldName: 'fake',
    field: null,
    isReference: isReference,
    toReference: () => undefined,
    storage: {},
    cache: new InMemoryCache(),
    //@ts-expect-error Works for testing
    readField: (field, obj) => {
      //@ts-expect-error Works for testing
      return obj[field];
    },
    canRead: () => false,
    mergeObjects: (existing, _incoming) => existing,
  };

  function createEdges(ids: (string | number)[]) {
    return ids.map((id) => ({ cursor: String(id), node: { id, __ref: `N:${id}` } }));
  }

  it.each([
    [
      [1, 2, 3, 4, 5],
      [5, 6, 7, 2, 3, 3],
      [1, 4, 5, 6, 7, 2, 3, 3],
      {
        after: '4',
      },
    ],
  ])('%s + %s => %s', (existingDesc, incomingDesc, expectedResultDesc, args) => {
    const existingEdges = createEdges(existingDesc);
    const incomingEdges = createEdges(incomingDesc);

    const result = merge(
      {
        edges: existingEdges,
      } as any,
      {
        edges: incomingEdges,
      },
      {
        ...options,
        args,
      }
    );

    const resultEdges = result?.edges.map((edge: any) => edge.node.id);
    expect(resultEdges).toStrictEqual(expectedResultDesc);
  });
});
