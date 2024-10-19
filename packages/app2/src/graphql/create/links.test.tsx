/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, it, vi } from 'vitest';
import { createDefaultGraphQLServiceParams } from '../../graphql-service';
import { createGraphQLService } from './service';
import { renderHook } from '@testing-library/react';
import { useUpdateDisplayNameMutation } from '../../user/hooks/useUpdateDisplayNameMutation';
import { ReactNode } from '@tanstack/react-router';
import { GraphQLServiceProvider } from '../components/GraphQLServiceProvider';
import { ApolloLink, Observable } from '@apollo/client';
import { setCurrentUser } from '../../user/models/signed-in-user/set-current';

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
    'PublicUser:bHwDFcR58o66Q1': {
      __typename: 'PublicUser',
      id: 'bHwDFcR58o66Q1',
      profile: {
        __typename: 'PublicUserProfile',
        displayName: 'Local Account',
      },
    },
    'SignedInUser:bHwDFcR58o66Q1': {
      __typename: 'SignedInUser',
      id: 'bHwDFcR58o66Q1',
      localOnly: true,
      public: {
        __ref: 'PublicUser:bHwDFcR58o66Q1',
      },
    },
    ROOT_QUERY: {
      __typename: 'Query',
      localUser: {
        __ref: 'SignedInUser:bHwDFcR58o66Q1',
      },
      signedInUsers: {
        [A_userId]: {
          __ref: `SignedInUser:${A_userId}`,
        },
        [B_userId]: {
          __ref: `SignedInUser:${B_userId}`,
        },
      },
      currentSignedInUser: {
        __ref: `SignedInUser:${A_userId}`,
      },
    },
    [`SignedInUser:${B_userId}`]: {
      __typename: 'SignedInUser',
      id: B_userId,
    },
    [`SignedInUser:${A_userId}`]: {
      __typename: 'SignedInUser',
      id: A_userId,
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <GraphQLServiceProvider service={service}>{children}</GraphQLServiceProvider>;
  }

  setCurrentUser(A_userId, cache);

  const { result } = renderHook(() => useUpdateDisplayNameMutation(), {
    wrapper: Wrapper,
  });

  void result.current('A');
  setCurrentUser(B_userId, cache);
  void result.current('B');
  void result.current('B2');

  await new Promise(process.nextTick.bind(process));

  expect(
    observableFn,
    'Both users mutations should have reached terminating link'
  ).toHaveBeenCalledTimes(2);
});
