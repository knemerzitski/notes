/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, expect, it, vi } from 'vitest';

import { mock, mockDeep } from 'vitest-mock-extended';

import { mockResolver } from '../../../../../__tests__/helpers/graphql/mock-resolver';
import { QueryableSession } from '../../../../../mongodb/loaders/session/description';
import { updateDisplayName } from '../../../../../services/user/update-display-name';

import { GraphQLResolversContext } from '../../../../types';

import { updateSignedInUserDisplayName } from './updateSignedInUserDisplayName';

vi.mock('../../../../../services/user/update-display-name');

afterEach(() => {
  vi.restoreAllMocks();
});

const resolveUpdateSignedInUserDisplayName = mockResolver(updateSignedInUserDisplayName);

it('calls updateDisplayName', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const mongoDB = mock<any>();

  await resolveUpdateSignedInUserDisplayName(
    undefined,
    {
      input: { authUser: { id: userId }, displayName },
    },
    mockDeep<GraphQLResolversContext>({
      services: {
        auth: mockDeep({
          getAuth() {
            return Promise.resolve({
              session: {
                userId,
              } as QueryableSession,
            });
          },
        }),
      },
      mongoDB,
    })
  );

  expect(updateDisplayName).toHaveBeenCalledWith({
    mongoDB,
    userId,
    displayName,
  });
});

it('returns UpdateSignedInUserDisplayNamePayload with query', async () => {
  const userId = mock<any>();
  const displayName = mock<any>();
  const mongoDB = mockDeep<GraphQLResolversContext['mongoDB']>();

  const query = mock<any>();
  const createQueryFn = mongoDB.loaders.user.createQueryFn;
  createQueryFn.mockReturnValueOnce(query);

  const auth = {
    session: {
      userId,
    } as QueryableSession,
  };

  const result = await resolveUpdateSignedInUserDisplayName(
    undefined,
    {
      input: { authUser: { id: userId }, displayName },
    },
    mockDeep<GraphQLResolversContext>({
      services: {
        auth: mockDeep({
          getAuth() {
            return Promise.resolve({
              session: {
                userId,
              } as QueryableSession,
            });
          },
        }),
      },
      mongoDB,
    })
  );

  expect(result).toEqual({
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName,
    signedInUser: {
      auth,
      query: query,
    },
  });

  expect(createQueryFn).toHaveBeenCalledWith({
    userId,
  });
});

it('accesses mongoDB once for createQueryFn', async () => {
  const mongoDB = mock<any>();

  await resolveUpdateSignedInUserDisplayName(
    mock<any>(),
    mockDeep<any>(),
    mockDeep({
      services: {
        auth: mockDeep({
          getAuth() {
            return mockDeep();
          },
        }),
      },
      mongoDB,
    } as any)
  );

  expect(mongoDB).toHaveBeenCalledTimesDeep(1);
});
