import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { addCreateNote } from './add-create';
import { NoteCreateStatus } from '../../../__generated__/graphql';

const GetOrAddEmptyCreateNote_Query = gql(`
  query GetOrAddEmptyCreateNote_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        createNotes {
          id
          createStatus
          note {
            id
          }        
        }
      }
    }
  }
`);

export function getOrAddEmptyCreateNoteId(
  userId: string,
  cache: Pick<
    ApolloCache<unknown>,
    'writeQuery' | 'readFragment' | 'identify' | 'readQuery'
  >
) {
  const data = cache.readQuery({
    query: GetOrAddEmptyCreateNote_Query,
    variables: {
      id: userId,
    },
  });

  const firstEmptyNoteLink = data?.signedInUser?.local.createNotes.find(
    (noteLink) => noteLink.createStatus === NoteCreateStatus.EMPTY
  );
  if (firstEmptyNoteLink) {
    return firstEmptyNoteLink.note.id;
  }

  const noteLink = addCreateNote(userId, cache);

  return noteLink.note.id;
}
