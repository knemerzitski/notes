/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from 'vitest';

import { Changeset } from '../../../../../../collab/src/changeset';
import { maybeCallFn } from '../../../../../../utils/src/maybe-call-fn';

import { mockResolver } from '../../../../__tests__/helpers/graphql/mock-resolver';
import { QueryableCollabText } from '../../../../mongodb/loaders/note/descriptions/collab-text';
import { createPartialValueQueryFn } from '../../../../mongodb/query/query';

import { CollabText } from './CollabText';

describe('textAtRevision', () => {
  const textAtRevision = mockResolver(CollabText.textAtRevision!);

  it('returns empty without fields', async () => {
    await expect(
      (await maybeCallFn(textAtRevision({} as any, {} as any)))?.query({})
    ).resolves.toStrictEqual({});
  });

  it('returns revision without changeset', async () => {
    await expect(
      (await maybeCallFn(textAtRevision({} as any, { revision: 7 })))?.query({
        revision: 1,
      })
    ).resolves.toStrictEqual({ revision: 7 });
  });

  it('returns empty revision 0 if arg revision is <= 0', async () => {
    await expect(
      (await maybeCallFn(textAtRevision({} as any, { revision: -1 })))?.query({
        revision: 1,
        changeset: 1,
      })
    ).resolves.toStrictEqual({ revision: 0, changeset: Changeset.EMPTY });
  });

  it('returns revision at tail', async () => {
    await expect(
      (
        await maybeCallFn(
          textAtRevision(
            {
              id: 'random',
              query: createPartialValueQueryFn<QueryableCollabText>(() => ({
                tailText: {
                  changeset: Changeset.fromInsertion('a'),
                  revision: 4,
                },
                records: [],
              })),
            },
            { revision: 4 }
          )
        )
      )?.query({
        revision: 1,
        changeset: 1,
      })
    ).resolves.toStrictEqual({ revision: 4, changeset: Changeset.fromInsertion('a') });
  });

  it('returns revision 1 after tail', async () => {
    await expect(
      (
        await maybeCallFn(
          textAtRevision(
            {
              id: 'random',
              query: createPartialValueQueryFn<QueryableCollabText>(() => ({
                tailText: {
                  changeset: Changeset.fromInsertion('a'),
                  revision: 4,
                },
                records: [
                  {
                    changeset: Changeset.parseValue([0, 'b']),
                    revision: 5,
                  },
                ],
              })),
            },
            { revision: 5 }
          )
        )
      )?.query({
        revision: 1,
        changeset: 1,
      })
    ).resolves.toStrictEqual({ revision: 5, changeset: Changeset.fromInsertion('ab') });
  });

  it('returns revision 2 after tail', async () => {
    await expect(
      (
        await maybeCallFn(
          textAtRevision(
            {
              id: 'random',
              query: createPartialValueQueryFn<QueryableCollabText>(() => ({
                tailText: {
                  changeset: Changeset.fromInsertion('a'),
                  revision: 4,
                },
                records: [
                  {
                    changeset: Changeset.parseValue([0, 'b']),
                    revision: 5,
                  },
                  {
                    changeset: Changeset.parseValue([[0, 1], 'c']),
                    revision: 6,
                  },
                ],
              })),
            },
            { revision: 6 }
          )
        )
      )?.query({
        revision: 1,
        changeset: 1,
      })
    ).resolves.toStrictEqual({ revision: 6, changeset: Changeset.fromInsertion('abc') });
  });

  it('throws error for future revision', async () => {
    await expect(async () =>
      (
        await maybeCallFn(
          textAtRevision(
            {
              id: 'random',
              query: createPartialValueQueryFn<QueryableCollabText>(() => ({
                tailText: {
                  changeset: Changeset.fromInsertion('a'),
                  revision: 4,
                },
                records: [
                  {
                    changeset: Changeset.parseValue([0, 'b']),
                    revision: 5,
                  },
                ],
              })),
            },
            { revision: 6 }
          )
        )
      )?.query({
        revision: 1,
        changeset: 1,
      })
    ).rejects.toThrowError(new Error('Invalid revision 6'));
  });
});
