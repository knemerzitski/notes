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
    [`PublicUser:${id}`]: {
      __typename: 'PublicUser',
      id: id,
      profile: {
        __typename: 'PublicUserProfile',
        displayName,
      },
    },
    [`LocalSignedInUser:${id}`]: {
      __typename: 'LocalSignedInUser',
      id: id,
    },
    [`SignedInUser:${id}`]: {
      __typename: 'SignedInUser',
      id: id,
      localOnly,
      public: {
        __ref: `PublicUser:${id}`,
      },
      local: {
        __ref: `LocalSignedInUser:${id}`,
      },
    },
  };
}
