import { ApolloLink, Observable } from '@apollo/client';
import { ReactNode } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { createDefaultGraphQLServiceParams } from '../../graphql-service';

import { CurrentUserIdProvider } from '../../user/components/CurrentUserIdProvider';
import { useUpdateDisplayNameMutation } from '../../user/hooks/useUpdateDisplayNameMutation';

import { setCurrentUser } from '../../user/models/signed-in-user/set-current';
import { GraphQLServiceProvider } from '../components/GraphQLServiceProvider';

import { createGraphQLService } from './service';

it('does not serialize different user same mutations', async () => {
  const A_userId = 'ZwjzAA054CFCvxuO';
  const B_userId = 'ZvUz78rA1oksJ90d';

  const params = createDefaultGraphQLServiceParams();
  params.wsUrl = undefined;
  params.linkOptions = {
    ...params.linkOptions,
    debug: {
      logging: true,
    },
  };

  const observableFn = vi.fn();
  params.terminatingLink = new ApolloLink(() => new Observable(observableFn));

  const service = createGraphQLService(params);
  const cache = service.client.cache;

  cache.restore({
    'User:bHwDFcR58o66Q1': {
      __typename: 'User',
      id: 'bHwDFcR58o66Q1',
      localOnly: true,
      profile: {
        __typename: 'UserProfile',
        displayName: 'Local Account',
      },
    },
    ROOT_QUERY: {
      __typename: 'Query',
      localUser: {
        __ref: 'User:bHwDFcR58o66Q1',
      },
      signedInUsers: {
        [A_userId]: {
          __ref: `User:${A_userId}`,
        },
        [B_userId]: {
          __ref: `User:${B_userId}`,
        },
      },
      currentSignedInUser: {
        __ref: `User:${A_userId}`,
      },
    },
    [`User:${B_userId}`]: {
      __typename: 'User',
      id: B_userId,
    },
    [`User:${A_userId}`]: {
      __typename: 'User',
      id: A_userId,
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <GraphQLServiceProvider service={service}>
        <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
      </GraphQLServiceProvider>
    );
  }

  setCurrentUser(A_userId, cache);

  const { result } = renderHook(() => useUpdateDisplayNameMutation(), {
    wrapper: Wrapper,
  });

  void result.current('A');
  setCurrentUser(B_userId, cache);

  await new Promise(process.nextTick.bind(process));

  void result.current('B');
  void result.current('B2');

  await new Promise(process.nextTick.bind(process));

  expect(
    observableFn,
    'Both users mutations should have reached terminating link'
  ).toHaveBeenCalledTimes(2);
});
