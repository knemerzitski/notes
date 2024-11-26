import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import {
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../../utils/id';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const RemoveCreateNote_Query = gql(`
  query RemoveCreateNote_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        createNotes {
          id
        }
      }
    }
  }
`);

export function removeCreateNote(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery' | 'evict' | 'identify'>
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);
  const { userId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: RemoveCreateNote_Query,
      variables: {
        id: userId,
      },
      overwrite: true,
    },
    (data) => {
      if (!data?.signedInUser) {
        return;
      }

      const createNotes = data.signedInUser.local.createNotes;

      const index = createNotes.findIndex((noteLink) => noteLink.id === userNoteLinkId);
      if (index === -1) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          local: {
            ...data.signedInUser.local,
            createNotes: [
              ...createNotes.slice(0, index),
              ...createNotes.slice(index + 1),
            ],
          },
        },
      };
    }
  );

  cache.evict({
    fieldName: 'create',
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });
}
