import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLink } from '../../../__generated__/graphql';
import { parseUserNoteLinkId } from '../../utils/id';

const RemoveUserFromNote_Query = gql(`
  query RemoveUserFromNote_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      users {
        id
      }
    }
  }
`);

export function removeUserFromNote(
  userNoteLinkId: UserNoteLink['id'],
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  const { noteId, userId } = parseUserNoteLinkId(userNoteLinkId);

  cache.updateQuery(
    {
      query: RemoveUserFromNote_Query,
      variables: {
        by: {
          id: noteId,
        },
      },
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }

      return {
        ...data,
        note: {
          ...data.note,
          users: data.note.users.filter((user) => user.id !== userId),
        },
      };
    }
  );
}
