/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { PublicUserProfile } from './PublicUserProfile';
import { mockResolver } from '../../../../__test__/helpers/graphql/mock-resolver';
import { wrapOnlyRawQueryFn } from '../../../../mongodb/query/query';

describe('displayName', () => {
  const resolveDisplayName = mockResolver(PublicUserProfile.displayName!);

  it('returns undefined without query', async () => {
    const displayName = await resolveDisplayName({
      query: wrapOnlyRawQueryFn(() => ({})),
    });

    expect(displayName).toStrictEqual(undefined);
  });

  it('returns undefined with empty value', async () => {
    const displayName = await resolveDisplayName({
      query: wrapOnlyRawQueryFn(() => ({
        displayName: undefined,
      })),
    });

    expect(displayName).toBeUndefined();
  });

  it('returns provided displayName', async () => {
    const displayName = await resolveDisplayName({
      query: wrapOnlyRawQueryFn(() => ({
        displayName: 'myname',
      })),
    });

    expect(displayName).toStrictEqual('myname');
  });
});
