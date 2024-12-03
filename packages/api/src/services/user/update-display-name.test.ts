/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, expect, it, vi } from 'vitest';

import { mock, mockDeep } from 'vitest-mock-extended';

import { updateDisplayName as model_updateDisplayName } from '../../mongodb/models/user/update-display-name';

import { updateDisplayName, UpdateDisplayNameParams } from './update-display-name';

vi.mock('../../mongodb/models/user/update-display-name');

afterEach(() => {
  vi.restoreAllMocks();
});

it('calls model_updateDisplayName', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const mongoDB = mockDeep<any>();

  await updateDisplayName({
    displayName,
    mongoDB,
    userId,
  });

  expect(model_updateDisplayName).toHaveBeenCalledWith({
    userId,
    displayName,
    mongoDB,
  });
});

it('primes loader with new displayName', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const mongoDB = mockDeep<UpdateDisplayNameParams['mongoDB']>();

  await updateDisplayName({
    displayName,
    mongoDB,
    userId,
  });

  expect(mongoDB.loaders.user.prime).toHaveBeenCalledWith(
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
      _id: userId,
      profile: {
        displayName,
      },
    }
  );
});
