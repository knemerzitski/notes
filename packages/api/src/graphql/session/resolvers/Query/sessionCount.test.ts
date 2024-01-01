import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../../../graphql/context';
import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';

import { sessionCount } from './sessionCount';

describe('activeSessionIndex', () => {
  const sessions = [faker.string.nanoid()];

  const mockedNoAuthContext = mockDeep<GraphQLResolversContext>({
    auth: undefined,
  });

  const mockedAuthContext = mockDeep<GraphQLResolversContext>({
    auth: {
      cookie: {
        sessions,
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
        await mockResolver(sessionCount)({}, {}, mockedNoAuthContext);
      }).rejects.toThrow(GraphQLError);
    });

    it('returns session count', async () => {
      const result = await mockResolver(sessionCount)({}, {}, mockedAuthContext);

      expect(result).toStrictEqual(sessions.length);
    });
  });

  describe('graphql server', () => {
    const query = `#graphql
      query {
        sessionCount
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
      expect(response.body.singleResult.errors).toBeDefined();
    });

    it('returns activeSessionIndex', async () => {
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
        sessionCount: sessions.length,
      });
    });

    it('returns error on empty sessions array', async () => {
      const ctx = mockDeep<GraphQLResolversContext>({
        auth: {
          cookie: {
            sessions: [],
          },
        },
      });

      const response = await apolloServer.executeOperation(
        {
          query,
        },
        {
          contextValue: ctx,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeDefined();
    });
  });
});
