/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, expect, it, vi } from 'vitest';
import { updateDisplayName } from './update-display-name';
import { updateDisplayName as model_updateDisplayName } from '../../mongodb/models/user/update-display-name';
import { mock, mockDeep } from 'vitest-mock-extended';
import { QueryableUserLoader } from '../../mongodb/loaders/user';

vi.mock('../../mongodb/models/user/update-display-name');

afterEach(() => {
  vi.restoreAllMocks();
});

it('calls model_updateDisplayName', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const collection = mock<any>();

  await updateDisplayName({
    displayName,
    mongoDB: {
      collections: {
        users: collection,
      },
      loaders: mockDeep(),
    },
    userId,
  });

  expect(model_updateDisplayName).toHaveBeenCalledWith({
    userId,
    displayName,
    collection,
  });
});

it('primes loader with new displayName', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const userLoader = mock<QueryableUserLoader>();

  await updateDisplayName({
    displayName,
    mongoDB: {
      collections: mockDeep(),
      loaders: {
        user: userLoader,
      },
    },
    userId,
  });

  expect(userLoader.prime).toHaveBeenCalledWith(
    {
      id: {
        userId,
      },
      query: {
        _id: 1,
        profile: {
          displayName: 1,
        },
      },
    },
    {
      result: {
        _id: userId,
        profile: {
          displayName,
        },
      },
      type: 'validated',
    },
    {
      clearCache: true,
    }
  );
});
