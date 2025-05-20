import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { Note } from '../../../__generated__/graphql';

const GetCollabTextAt_Query = gql(`
  query GetCollabTextAt_Query(
      $id: ObjectID!, $revision: NonNegativeInt!,
    ) {
    note(by: { id: $id }) {
      id
      collabText {
        id
        textAtRevision(revision: $revision) {
          revision
          text
        }
      }
    }
  }
`);

export function getCollabTextAt(
  noteId: Note['id'],
  revision: number,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: GetCollabTextAt_Query,
    variables: {
      id: noteId,
      revision,
    },
  });

  if (!data) {
    return null;
  }

  return data.note.collabText.textAtRevision;
}
