import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NoteCategory, UserNoteLinkByInput } from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

const GetCategoryName_Query = gql(`
  query GetCategoryName_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }
    }
  }
`);

export function getCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): NoteCategory {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  const data = cache.readQuery({
    query: GetCategoryName_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  if (!data) {
    throw new Error(`Unexpected failed to get category for note "${noteId}"`);
  }

  return data.signedInUser.noteLink.categoryName;
}
