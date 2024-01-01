import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../../../graphql/context';
import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';

import { activeSessionIndex } from './activeSessionIndex';

describe('activeSessionIndex', () => {
  const sessionIndex = faker.number.int({ min: 0, max: 8 });

  const mockedNoAuthContext = mockDeep<GraphQLResolversContext>({
    auth: undefined,
  });

  const mockedAuthContext = mockDeep<GraphQLResolversContext>({
    auth: {
      cookie: {
        index: sessionIndex,
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
        await mockResolver(activeSessionIndex)({}, {}, mockedNoAuthContext);
      }).rejects.toThrow(GraphQLError);
    });

    it('returns session index', async () => {
      const result = await mockResolver(activeSessionIndex)({}, {}, mockedAuthContext);

      expect(result).toStrictEqual(sessionIndex);
    });
  });

  describe('graphql server', () => {
    const query = `#graphql
      query {
        activeSessionIndex
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
        activeSessionIndex: sessionIndex,
      });
    });

    it('returns error on context negative index', async () => {
      const mockedCtx = mockDeep<GraphQLResolversContext>({
        auth: {
          cookie: {
            index: -4,
          },
        },
      });

      const response = await apolloServer.executeOperation(
        {
          query,
        },
        {
          contextValue: mockedCtx,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeDefined();
    });
  });
});
