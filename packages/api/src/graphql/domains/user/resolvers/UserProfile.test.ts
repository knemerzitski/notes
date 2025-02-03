/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';

import { mockResolver } from '../../../../__tests__/helpers/graphql/mock-resolver';
import { createPartialValueQueryFn } from '../../../../mongodb/query/query';
import { UserSchema } from '../../../../mongodb/schema/user';

import { UserProfile } from './UserProfile';

describe('displayName', () => {
  const resolveDisplayName = mockResolver(UserProfile.displayName!);

  it('returns undefined without query', async () => {
    const displayName = await resolveDisplayName({
      query: createPartialValueQueryFn<UserSchema['profile']>(() => ({})),
    });

    expect(displayName).toStrictEqual(undefined);
  });

  it('returns undefined with empty value', async () => {
    const displayName = await resolveDisplayName({
      query: createPartialValueQueryFn<UserSchema['profile']>(() => ({
        displayName: undefined,
      })),
    });

    expect(displayName).toBeUndefined();
  });

  it('returns provided displayName', async () => {
    const displayName = await resolveDisplayName({
      query: createPartialValueQueryFn<UserSchema['profile']>(() => ({
        displayName: 'myname',
      })),
    });

    expect(displayName).toStrictEqual('myname');
  });
});
