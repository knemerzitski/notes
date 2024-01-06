import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import { GraphQLResolversContext } from '../../../context';

import { activeUserInfo } from './activeUserInfo';

// TODO flatten describe

describe('activeUserInfo', () => {
  const displayName = faker.person.firstName();

  const mockedNoAuthContext = mockDeep<GraphQLResolversContext>({
    auth: undefined,
  });

  const mockedAuthContext = mockDeep<GraphQLResolversContext>({
    auth: {
      session: {
        user: {
          profile: {
            displayName,
          },
        },
      },
    },
  });

  beforeEach(() => {
    mockReset(mockedNoAuthContext);
    mockReset(mockedAuthContext);
  });

  describe('directly', () => {
    it('throws error if not authenticated', async () => {
      await expect(async () => {
        await mockResolver(activeUserInfo)({}, {}, mockedNoAuthContext);
      }).rejects.toThrow(GraphQLError);
    });

    it('returns displayName', async () => {
      const result = await mockResolver(activeUserInfo)({}, {}, mockedAuthContext);

      expect(result).toStrictEqual({
        profile: {
          displayName,
        },
      });
    });
  });

  describe('graphql server', () => {
    const query = `#graphql
      query {
        activeUserInfo {
          profile {
            displayName
          }
        }
      }
    `;

    it('returns error if not authenticated', async () => {
      const response = await apolloServer.executeOperation(
        {
          query,
        },
        {
          contextValue: mockedNoAuthContext,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).containSubset([
        {
          message: 'You are not authorized to perform this action.',
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        },
      ]);
    });

    it('returns user displayName', async () => {
      const response = await apolloServer.executeOperation(
        {
          query,
        },
        {
          contextValue: mockedAuthContext,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data).toEqual({
        activeUserInfo: {
          profile: {
            displayName,
          },
        },
      });
    });
  });
});
