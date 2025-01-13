import { ApolloCache } from '@apollo/client';

import { gql } from '../../__generated__';
import {
  SignedInUser,
  UserNoteLink,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../utils/id';

const UpdateUnsavedCollabService = gql(`
  query AddUnsavedNote_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        unsavedCollabServices {
          id
        }
      }
    }
  }
`);

export function updateUnsavedCollabService(
  by: UserNoteLinkByInput,
  isServiceUpToDate: boolean,
  cache: Pick<ApolloCache<unknown>, 'updateQuery' | 'writeQuery' | 'readQuery'>
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);
  const { userId } = parseUserNoteLinkByInput(by, cache);

  if (isServiceUpToDate) {
    remove(userId, userNoteLinkId, cache);
  } else {
    add(userId, userNoteLinkId, cache);
  }
}

function add(
  userId: SignedInUser['id'],
  userNoteLinkId: UserNoteLink['id'],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: UpdateUnsavedCollabService,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'SignedInUser',
        id: userId,
        local: {
          __typename: 'LocalSignedInUser',
          id: userId,
          unsavedCollabServices: [
            {
              __typename: 'UserNoteLink',
              id: userNoteLinkId,
            },
          ],
        },
      },
    },
  });
}

function remove(
  userId: SignedInUser['id'],
  userNoteLinkId: UserNoteLink['id'],
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  cache.updateQuery(
    {
      query: UpdateUnsavedCollabService,
      variables: {
        id: userId,
      },
      overwrite: true,
    },
    (data) => {
      if (!data?.signedInUser) {
        return;
      }

      const unsavedCollabServices = data.signedInUser.local.unsavedCollabServices;

      const index = unsavedCollabServices.findIndex(
        (noteLink) => noteLink.id === userNoteLinkId
      );
      if (index === -1) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          local: {
            ...data.signedInUser.local,
            unsavedCollabServices: [
              ...unsavedCollabServices.slice(0, index),
              ...unsavedCollabServices.slice(index + 1),
            ],
          },
        },
      };
    }
  );
}
