/* eslint-disable @typescript-eslint/no-explicit-any */
import { NormalizedCacheObject } from '@apollo/client';

import { createUserForCache } from './user';

export function createUsersForCache({
  users,
}: {
  users: Parameters<typeof createUserForCache>[0][];
}): NormalizedCacheObject {
  const localUser = users.find((user) => !!user.localOnly);
  const remoteUsers = users.filter((user) => !user.localOnly);

  const data: any = {};

  for (const user of users) {
    Object.assign(data, createUserForCache(user));
  }

  Object.assign(data, {
    ROOT_QUERY: {
      __typename: 'Query',
      ...(localUser && {
        localUser: {
          __ref: `SignedInUser:${localUser.id}`,
        },
      }),
      signedInUsers: Object.fromEntries(
        remoteUsers.map((user) => [user.id, { __ref: `SignedInUser:${user.id}` }])
      ),
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data;
}
