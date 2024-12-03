/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloCache, ApolloLink, gql, Observable } from '@apollo/client';
import { ReactNode } from '@tanstack/react-router';
import { render, renderHook } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterEach, expect, it, vi } from 'vitest';

import { createUsersForCache } from '../../__tests__/helpers/populate/users';
import { createDefaultGraphQLServiceParams } from '../../graphql-service';
import { CurrentUserIdProvider } from '../../user/components/CurrentUserIdProvider';
import { useUpdateDisplayNameMutation } from '../../user/hooks/useUpdateDisplayNameMutation';
import { setCurrentUser } from '../../user/models/signed-in-user/set-current';
import { GraphQLServiceProvider } from '../components/GraphQLServiceProvider';

import { createGraphQLService } from '../create/service';

function readDisplayName(
  userId: string,
  cache: ApolloCache<unknown>,
  optimistic: boolean
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const user: any = cache.readFragment({
    fragment: gql(`
      fragment f on SignedInUser {
        public {
          profile {
            displayName
          }
        }
      }  
    `),
    id: `SignedInUser:${userId}`,
    optimistic,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return user.public.profile.displayName;
}

afterEach(() => {
  vi.restoreAllMocks();
});

it('remembers displayName mutation when app goes offline and resumes when online', async () => {
  const onLineSpy = vi.spyOn(window.navigator, 'onLine', 'get');

  const userA = 'aaaaaaaaaaaaaaaa';

  const storage = new Map();
  storage.set(
    'cache',
    JSON.stringify(
      createUsersForCache({
        users: [
          {
            id: userA,
          },
          {
            id: 'bbbbbbbbbbbbbbbb',
          },
        ],
      })
    )
  );

  const params = createDefaultGraphQLServiceParams();
  params.storageKey = 'cache';
  params.storage = {
    getItem(key) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return storage.get(key);
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  params.purgeCache = false;

  params.linkOptions = {
    ...params.linkOptions,
    debug: {
      ...params.linkOptions?.debug,
      logging: false,
    },
  };

  params.terminatingLink = new ApolloLink(() =>
    Observable.of({
      data: {
        updateSignedInUserDisplayName: {
          signedInUser: {
            id: userA,
            public: {
              id: userA,
              profile: {
                displayName: 'new name',
                __typename: 'PublicUserProfile',
              },
              __typename: 'PublicUser',
            },
            __typename: 'SignedInUser',
          },
          __typename: 'UpdateSignedInUserDisplayNamePayload',
        },
      },
    })
  );

  async function runDisplayNameMutationAndPersist() {
    const service = createGraphQLService(params);
    const cache = service.client.cache;
    await service.restorer.restored();
    setCurrentUser(userA, cache);

    const {
      result: { current: updateDisplayName },
    } = renderHook(() => useUpdateDisplayNameMutation(), {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <GraphQLServiceProvider service={service}>
            <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
          </GraphQLServiceProvider>
        );
      },
    });

    void updateDisplayName('new name');

    // Wait for links to execute
    await new Promise(process.nextTick.bind(process));

    await service.persistor.persist();
    service.dispose();
  }

  async function expectPersistedNormalAndOptimisticDisplayName() {
    const service = createGraphQLService(params);
    const cache = service.client.cache;
    await service.restorer.restored();

    // Resumes persisted operations
    render(<GraphQLServiceProvider service={service}>{null}</GraphQLServiceProvider>);

    expect(readDisplayName(userA, cache, false)).toStrictEqual(userA);
    expect(
      readDisplayName(userA, cache, true),
      'Operation was not persisted or resumed'
    ).toStrictEqual('new name');

    service.dispose();
  }

  async function expectMutationResumedWhenOnline() {
    const service = createGraphQLService(params);
    const cache = service.client.cache;
    await service.restorer.restored();

    // Resumes persisted operations
    render(<GraphQLServiceProvider service={service}>{null}</GraphQLServiceProvider>);

    // Wait for link to process mutation
    await new Promise(process.nextTick.bind(process));

    expect(
      readDisplayName(userA, cache, false),
      'Operation did not finish'
    ).toStrictEqual('new name');
    expect(readDisplayName(userA, cache, true)).toStrictEqual('new name');

    service.dispose();
  }

  onLineSpy.mockReturnValue(false);
  await runDisplayNameMutationAndPersist();
  await expectPersistedNormalAndOptimisticDisplayName();
  onLineSpy.mockReturnValue(true);
  await expectMutationResumedWhenOnline();
});

it('remembers displayName mutation when session expires', async () => {
  const userA = 'aaaaaaaaaaaaaaaa';

  const storage = new Map();
  storage.set(
    'cache',
    JSON.stringify(
      createUsersForCache({
        users: [
          {
            id: userA,
          },
          {
            id: 'bbbbbbbbbbbbbbbb',
          },
        ],
      })
    )
  );

  const params = createDefaultGraphQLServiceParams();
  params.storageKey = 'cache';
  params.storage = {
    getItem(key) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return storage.get(key);
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  params.purgeCache = false;

  params.linkOptions = {
    ...params.linkOptions,
    debug: {
      ...params.linkOptions?.debug,
      logging: false,
    },
  };

  let observableReturnType: 'session_expired' | 'display_name' = 'session_expired';

  const linkObservable = new Observable<any>((sub) => {
    if (observableReturnType === 'session_expired') {
      sub.next({
        errors: [
          new GraphQLError('Session expired', {
            extensions: {
              code: 'UNAUTHENTICATED',
              reason: 'SESSION_EXPIRED',
            },
          }),
        ],
        data: null,
      });
    } else {
      sub.next({
        data: {
          updateSignedInUserDisplayName: {
            signedInUser: {
              id: userA,
              public: {
                id: userA,
                profile: {
                  displayName: 'new name',
                  __typename: 'PublicUserProfile',
                },
                __typename: 'PublicUser',
              },
              __typename: 'SignedInUser',
            },
            __typename: 'UpdateSignedInUserDisplayNamePayload',
          },
        },
      });
    }

    sub.complete();
  });

  params.terminatingLink = new ApolloLink(() => linkObservable);

  // Create service
  const service = createGraphQLService(params);
  const cache = service.client.cache;
  await service.restorer.restored();
  setCurrentUser(userA, cache);

  // Render mutation hook and call it
  const {
    result: { current: updateDisplayName },
  } = renderHook(() => useUpdateDisplayNameMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <GraphQLServiceProvider service={service}>
          <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
        </GraphQLServiceProvider>
      );
    },
  });
  void updateDisplayName('new name');

  // Wait for links to execute
  await new Promise(process.nextTick.bind(process));

  // Mutation is optimistic and hasn't finished
  expect(readDisplayName(userA, cache, false)).toStrictEqual(userA);
  expect(readDisplayName(userA, cache, true)).toStrictEqual('new name');

  // Open gate as if session is no longer expired and server will return correct result
  observableReturnType = 'display_name';
  const gate = service.getUserGate(userA);
  gate.open();

  // Wait for links to execute
  await new Promise(process.nextTick.bind(process));

  expect(
    readDisplayName(userA, cache, false),
    'Mutation did not finish. A link is not sending it through.'
  ).toStrictEqual('new name');
  expect(readDisplayName(userA, cache, true)).toStrictEqual('new name');
});
