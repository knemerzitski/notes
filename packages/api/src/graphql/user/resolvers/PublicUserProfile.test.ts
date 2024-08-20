/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { mockResolver } from '../../../__test__/helpers/graphql/mock-resolver';
import { PublicUserProfile } from './PublicUserProfile';

describe('displayName', () => {
  const resolveDisplayName = mockResolver(PublicUserProfile.displayName!);

  it('returns undefined without query', async () => {
    const displayName = await resolveDisplayName({
      query: () => ({}),
    });

    expect(displayName).toStrictEqual(undefined);
  });

  it('returns undefined with empty value', async () => {
    const displayName = await resolveDisplayName({
      query: () => ({
        displayName: undefined,
      }),
    });

    expect(displayName).toBeUndefined();
  });

  it('returns provided displayName', async () => {
    const displayName = await resolveDisplayName({
      query: () => ({
        displayName: 'myname',
      }),
    });

    expect(displayName).toStrictEqual('myname');
  });
});
