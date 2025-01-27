import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NotePendingStatus, UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../../utils/id';
import { noteExists } from '../note/exists';

const SetNotePendingStatus_Query = gql(`
  query SetNotePendingStatus_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        pendingStatus
      }
    }
  }
`);

const SetNotePendingStatusList_Query = gql(`
  query SetNotePendingStatusList_Query($userId: ObjectID!) {
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
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);
  const userNoteLinkId = getUserNoteLinkId(noteId, userId);

  if (noteExists(by, cache) && pendingStatus != null) {
    // Update status
    cache.writeQuery({
      query: SetNotePendingStatus_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
      },
      data: {
        __typename: 'Query',
        signedInUser: {
          __typename: 'SignedInUser',
          id: userId,
          noteLink: {
            __typename: 'UserNoteLink',
            id: userNoteLinkId,
            pendingStatus,
          },
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
