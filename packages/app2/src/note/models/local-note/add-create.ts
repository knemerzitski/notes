import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { getUserNoteLinkId, getCollabTextId } from '../../utils/id';
import { generateNoteId } from './generate-id';
import {
  AddCreateNoteQueryQuery,
  NoteCreateStatus,
} from '../../../__generated__/graphql';
import { Changeset } from '~collab/changeset';

const AddCreateNote_Query = gql(`
  query AddCreateNote_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        createNotes {
          id
          createStatus
          excludeFromConnection
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

export function addCreateNote(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readFragment' | 'identify'>
) {
  const noteId = generateNoteId(cache);
  const userNoteLinkId = getUserNoteLinkId(noteId, userId);
  const collabTextId = getCollabTextId(noteId);

  const userNoteLink: NonNullable<
    AddCreateNoteQueryQuery['signedInUser']
  >['local']['createNotes'][0] = {
    __typename: 'UserNoteLink',
    id: userNoteLinkId,
    createStatus: NoteCreateStatus.EMPTY,
    excludeFromConnection: true,
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

  // TODO test if writes to cache?
  cache.writeQuery({
    query: AddCreateNote_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'SignedInUser',
        id: userId,
        local: {
          __typename: 'LocalSignedInUser',
          id: userId,
          createNotes: [userNoteLink],
        },
      },
    },
  });

  return userNoteLink;
}
