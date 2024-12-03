import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NotePendingStatus, UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../../utils/id';
import { noteExists } from '../note/exists';

const SetNotePendingStatus_Query = gql(`
  query SetNotePendingStatus_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      pendingStatus
    }
  }
`);

const SetNotePendingStatusList_Query = gql(`
  query SetNotePendingStatusList_Query($userId: ID!) {
    signedInUser(by: { id: $userId }) {
      id
      local {
        id
        pendingNotes {
          id
        }
      }
    }
  }
`);

export function setNotePendingStatus(
  by: UserNoteLinkByInput,
  pendingStatus: NotePendingStatus | null,
  cache: Pick<
    ApolloCache<unknown>,
    'updateQuery' | 'writeQuery' | 'readQuery' | 'evict' | 'identify'
  >
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);
  const { userId } = parseUserNoteLinkByInput(by, cache);

  if (noteExists(by, cache) && pendingStatus != null) {
    // Update status
    cache.writeQuery({
      query: SetNotePendingStatus_Query,
      variables: {
        by,
      },
      data: {
        __typename: 'Query',
        userNoteLink: {
          __typename: 'UserNoteLink',
          id: getUserNoteLinkIdFromByInput(by, cache),
          pendingStatus,
        },
      },
    });

    // Add to list if missing
    cache.updateQuery(
      {
        query: SetNotePendingStatusList_Query,
        variables: {
          by,
          userId,
        },
        overwrite: true,
      },
      (data) => {
        if (!data?.signedInUser) {
          return;
        }

        const pendingNotes = data.signedInUser.local.pendingNotes;
        const index = pendingNotes.findIndex(
          (noteLink) => noteLink.id === userNoteLinkId
        );
        if (index >= 0) {
          // Found the note
          return;
        }

        return {
          ...data,
          signedInUser: {
            ...data.signedInUser,
            local: {
              ...data.signedInUser.local,
              pendingNotes: [
                ...pendingNotes,
                {
                  __typename: 'UserNoteLink',
                  id: userNoteLinkId,
                } as const,
              ],
            },
          },
        };
      }
    );
  } else {
    // Remove from list
    cache.updateQuery(
      {
        query: SetNotePendingStatusList_Query,
        variables: {
          by,
          userId,
        },
        overwrite: true,
      },
      (data) => {
        if (!data?.signedInUser) {
          return;
        }

        const pendingNotes = data.signedInUser.local.pendingNotes;
        const index = pendingNotes.findIndex(
          (noteLink) => noteLink.id === userNoteLinkId
        );
        if (index < 0) {
          return;
        }

        return {
          ...data,
          signedInUser: {
            ...data.signedInUser,
            local: {
              ...data.signedInUser.local,
              pendingNotes: [
                ...pendingNotes.slice(0, index),
                ...pendingNotes.slice(index + 1),
              ],
            },
          },
        };
      }
    );

    // Delete status field
    cache.evict({
      fieldName: 'pendingStatus',
      id: cache.identify({
        __typename: 'UserNoteLink',
        id: userNoteLinkId,
      }),
    });
  }
}
