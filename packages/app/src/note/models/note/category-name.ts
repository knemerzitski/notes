import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NoteCategory, UserNoteLinkByInput } from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

const GetCategoryName_Query = gql(`
  query GetCategoryName_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
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
): NoteCategory | undefined {
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

  return data?.signedInUser.noteLink.categoryName;
}
