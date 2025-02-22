import { ApolloCache } from '@apollo/client';

import { Changeset } from '~collab/changeset';

import { gql } from '../../../__generated__';
import {
  GetOrCreatePendingNoteAddQueryQuery,
  NotePendingStatus,
} from '../../../__generated__/graphql';

import { getCollabTextId, getUserNoteLinkId } from '../../utils/id';

import { generateNoteId } from './generate-id';

const GetOrCreatePendingNote_Query = gql(`
  query GetOrCreatePendingNote_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        pendingNotes {
          id
          pendingStatus
          note {
            id
          }        
        }
      }
    }
  }
`);

const GetOrCreatePendingNoteAdd_Query = gql(`
  query GetOrCreatePendingNoteAdd_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        pendingNotes {
          id
          pendingStatus
          hiddenInList
          note {
            id
            collabText {
              id
              headText {
                revision
                changeset
              }
            }
          }        
        }
      }
    }
  }
`);

export function getOrCreatePendingNote(
  userId: string,
  cache: Pick<
    ApolloCache<unknown>,
    'writeQuery' | 'readFragment' | 'identify' | 'readQuery'
  >
) {
  const data = cache.readQuery({
    query: GetOrCreatePendingNote_Query,
    variables: {
      id: userId,
    },
  });

  const firstEmptyNoteLink = data?.signedInUser.local.pendingNotes.find(
    (noteLink) => noteLink.pendingStatus === NotePendingStatus.EMPTY
  );
  if (firstEmptyNoteLink) {
    return firstEmptyNoteLink.note.id;
  }

  const noteLink = add(userId, cache);

  return noteLink.note.id;
}

function add(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readFragment' | 'identify'>
) {
  const noteId = generateNoteId(cache);
  const userNoteLinkId = getUserNoteLinkId(noteId, userId);
  const collabTextId = getCollabTextId(noteId);

  const userNoteLink: NonNullable<
    GetOrCreatePendingNoteAddQueryQuery['signedInUser']
  >['local']['pendingNotes'][0] = {
    __typename: 'UserNoteLink',
    id: userNoteLinkId,
    pendingStatus: NotePendingStatus.EMPTY,
    hiddenInList: true,
    note: {
      __typename: 'Note',
      id: noteId,
      collabText: {
        __typename: 'CollabText',
        id: collabTextId,
        headText: {
          __typename: 'RevisionChangeset',
          revision: 0,
          changeset: Changeset.EMPTY,
        },
      },
    },
  };

  cache.writeQuery({
    query: GetOrCreatePendingNoteAdd_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'User',
        id: userId,
        local: {
          __typename: 'LocalUser',
          id: userId,
          pendingNotes: [userNoteLink],
        },
      },
    },
  });

  return userNoteLink;
}
