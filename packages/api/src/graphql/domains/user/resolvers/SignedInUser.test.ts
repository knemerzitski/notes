/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi } from 'vitest';
import { SignedInUser } from './SignedInUser';
import { ObjectId } from 'mongodb';
import { maybeCallFn } from '~utils/maybe-call-fn';
import { mockResolver } from '../../../../__test__/helpers/graphql/mock-resolver';
import { createPartialValueQueryFn } from '../../../../mongodb/query/query';
import { UserSchema } from '../../../../mongodb/schema/user';

describe('id', () => {
  const resolveId = mockResolver(SignedInUser.id!);

  it('returns undefined with empty object', async () => {
    const id = await resolveId({
      query: createPartialValueQueryFn<Pick<UserSchema, '_id' | 'profile'>>(() => {
        return {};
      }),
    });
    expect(id).toBeUndefined();
  });

  it('returns provided _id', async () => {
    const _id = new ObjectId();
    const id = await resolveId({
      query: createPartialValueQueryFn<Pick<UserSchema, '_id' | 'profile'>>(() => {
        return {
          _id,
        };
      }),
    });
    expect(id).toStrictEqual(_id);
  });
});

describe('public', () => {
  const resolvePublic = mockResolver(SignedInUser.public!);

  it('returns parent query', async () => {
    const queryFn = vi.fn();
    const _public = await maybeCallFn(
      resolvePublic({
        query: queryFn,
      })
    );

    expect(_public?.query).toStrictEqual(queryFn);
  });
});
