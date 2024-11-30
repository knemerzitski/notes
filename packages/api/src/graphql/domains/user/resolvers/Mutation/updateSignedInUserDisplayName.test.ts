/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, expect, it, vi } from 'vitest';
import { updateDisplayName } from '../../../../../services/user/update-display-name';
import { mockResolver } from '../../../../../__tests__/helpers/graphql/mock-resolver';
import { updateSignedInUserDisplayName } from './updateSignedInUserDisplayName';
import { mock, mockDeep } from 'vitest-mock-extended';
import { GraphQLResolversContext } from '../../../../types';

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
      input: { displayName },
    },
    mockDeep<GraphQLResolversContext>({
      auth: {
        session: {
          userId,
        },
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

  const result = await resolveUpdateSignedInUserDisplayName(
    undefined,
    {
      input: { displayName },
    },
    mockDeep<GraphQLResolversContext>({
      auth: {
        session: {
          userId,
        },
      },
      mongoDB,
    })
  );

  expect(result).toEqual({
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName,
    signedInUser: {
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
    mock<any>(),
    mockDeep<GraphQLResolversContext>({
      mongoDB,
    })
  );

  expect(mongoDB).toHaveBeenCalledTimesDeep(1);
});
