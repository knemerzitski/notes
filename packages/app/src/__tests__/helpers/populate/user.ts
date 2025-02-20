export function createUserForCache({
  id,
  displayName = id,
  localOnly = false,
}: {
  id: string;
  displayName?: string;
  localOnly?: boolean;
}) {
  return {
    [`LocalUser:${id}`]: {
      __typename: 'LocalUser',
      id: id,
    },
    [`User:${id}`]: {
      __typename: 'User',
      id: id,
      localOnly,
      profile: {
        __typename: 'UserProfile',
        displayName,
      },
      local: {
        __ref: `LocalUser:${id}`,
      },
    },
  };
}
