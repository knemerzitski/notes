import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import {
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../../utils/id';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const RemoveUnsavedNote_Query = gql(`
  query RemoveUnsavedNote_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        unsavedNotes {
          id
        }
      }
    }
  }
`);

export function removeUnsavedNote(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'updateQuery' | 'readQuery' | 'evict' | 'identify'>
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);
  const { userId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: RemoveUnsavedNote_Query,
      variables: {
        id: userId,
      },
      overwrite: true,
    },
    (data) => {
      if (!data?.signedInUser) {
        return;
      }

      const unsavedNotes = data.signedInUser.local.unsavedNotes;

      const index = unsavedNotes.findIndex((noteLink) => noteLink.id === userNoteLinkId);
      if (index === -1) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          local: {
            ...data.signedInUser.local,
            unsavedNotes: [
              ...unsavedNotes.slice(0, index),
              ...unsavedNotes.slice(index + 1),
            ],
          },
        },
      };
    }
  );
}
