import { ObjectId } from 'mongodb';
import { describe, it, expect } from 'vitest';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { primeNewDisplayName } from './user-loader';
import { mock } from 'vitest-mock-extended';

describe('primeDisplayName', () => {
  it('primes user with provided displayName', async () => {
    const loader = new QueryableUserLoader({
      context: {
        collections: mock(),
      },
    });
    const userId = new ObjectId();

    primeNewDisplayName({
      userId,
      newDisplayName: 'new name',
      loader,
    });

    await expect(
      loader.load({
        id: {
          userId,
        },
        query: {
          profile: {
            displayName: 1,
          },
        },
      })
    ).resolves.toStrictEqual({
      _id: userId,
      profile: {
        displayName: 'new name',
      },
    });
  });
});
