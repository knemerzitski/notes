import { ApolloCache, makeReference } from '@apollo/client';
import { Maybe, SignedInUser, UserNoteLinkByInput } from '../../__generated__/graphql';
import { isLocalId } from '../../utils/is-local-id';
import { noteExists } from './note/exists';
import { addUserOperations } from '../../user/models/operations/add';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';
import {
  getUserNoteLinkId,
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../utils/id';
import { setNoteExternalStateFromOtherNote } from '../policies/Note/_external';
import { isExcludeNoteFromConnection } from './local-note/is-exclude';
import { excludeNoteFromConnection } from './local-note/exclude';
import { replaceNoteInConnection } from './note-connection/replace';

/**
 * Copy local note state to a remote one and delete local note.
 */
export function convertLocalToRemoteNote(
  localBy: UserNoteLinkByInput,
  remoteBy: UserNoteLinkByInput,
  {
    cache,
    userId = getCurrentUserId(cache),
  }: {
    /**
     * Use who runs required mutations
     */
    userId?: Maybe<SignedInUser['id']>;
    cache: Pick<
      ApolloCache<unknown>,
      | 'readQuery'
      | 'updateQuery'
      | 'writeQuery'
      | 'identify'
      | 'readFragment'
      | 'writeFragment'
    >;
  }
) {
  const { noteId: localNoteId } = parseUserNoteLinkByInput(localBy, cache);
  const { noteId: remoteNoteId } = parseUserNoteLinkByInput(remoteBy, cache);

  if (!isLocalId(localNoteId)) {
    throw new Error(`Expected "${localNoteId}" to be a local id`);
  }
  if (isLocalId(remoteNoteId)) {
    throw new Error(`Expected "${remoteNoteId}" to not be a local id`);
  }

  if (userId == null) {
    throw new Error('userId is required');
  }

  const remoteUserNoteLinkId = getUserNoteLinkIdFromByInput(remoteBy, cache);

  // Check if note is deleted/doesn't exist
  if (
    !noteExists(
      {
        noteId: localNoteId,
      },
      cache
    )
  ) {
    // Local version of note is already deleted, mark remote note for deletion
    addUserOperations(
      userId,
      [
        {
          __typename: 'DeleteNoteUserOperation',
          userNoteLink: {
            __typename: 'UserNoteLink',
            id: remoteUserNoteLinkId,
          },
        },
      ],
      cache
    );
    // Return early since note is already deleted
    return false;
  }

  // Link CollabService
  const sourceNoteId = cache.identify({
    __typename: 'Note',
    id: localNoteId,
  });
  if (!sourceNoteId) {
    throw new Error(`Failed to identify note "${localNoteId}"`);
  }
  const sourceNoteRef = makeReference(sourceNoteId);

  const targetNoteId = cache.identify({
    __typename: 'Note',
    id: remoteNoteId,
  });
  if (!targetNoteId) {
    throw new Error(`Failed to identify note "${remoteNoteId}"`);
  }
  const targetNoteRef = makeReference(targetNoteId);
  const service = setNoteExternalStateFromOtherNote(sourceNoteRef, targetNoteRef, cache);

  // Copy excludeFromConnection
  if (
    isExcludeNoteFromConnection(
      {
        noteId: localNoteId,
      },
      cache
    )
  ) {
    excludeNoteFromConnection(
      {
        id: remoteUserNoteLinkId,
      },
      cache
    );
  }

  // Copy category, move or trash
  const moveOrTrashInput = replaceNoteInConnection(localBy, remoteBy, cache);
  if (moveOrTrashInput?.type === 'MoveUserNoteLinkInput') {
    const input = moveOrTrashInput.input;
    addUserOperations(
      userId,
      [
        {
          __typename: 'MoveNoteUserOperation',
          userNoteLink: {
            __typename: 'UserNoteLink',
            id: getUserNoteLinkId(input.noteId, userId),
          },
          ...(input.location && {
            location: {
              __typename: 'NoteLocation',
              categoryName: input.location.categoryName,
              anchorPosition: input.location.anchorPosition,
              ...(input.location.anchorNoteId && {
                anchorUserNoteLink: {
                  __typename: 'UserNoteLink',
                  id: getUserNoteLinkId(input.location.anchorNoteId, userId),
                },
              }),
            },
          }),
        },
      ],
      cache
    );
  } else if (moveOrTrashInput?.type === 'TrashUserNoteLinkInput') {
    const input = moveOrTrashInput.input;
    addUserOperations(
      userId,
      [
        {
          __typename: 'TrashNoteUserOperation',
          userNoteLink: {
            __typename: 'UserNoteLink',
            id: getUserNoteLinkId(input.noteId, userId),
          },
        },
      ],
      cache
    );
  }

  // On next tick, delete local note since it has been replaced by remote one
  // Use timeout to give time to process any immediate change (e.g NoteCreateStatus.CONVERTING)
  excludeNoteFromConnection(
    {
      noteId: localNoteId,
    },
    cache
  );
  setTimeout(() => {
    addUserOperations(
      userId,
      [
        {
          __typename: 'DeleteNoteUserOperation',
          userNoteLink: {
            __typename: 'UserNoteLink',
            id: getUserNoteLinkId(localNoteId, userId),
          },
        },
      ],
      cache
    );
  }, 0);

  return { service };
}
