import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import {
  MovableNoteCategory,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';

const OriginalCategoryName_Query = gql(`
  query OriginalCategoryName_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      categoryName
      originalCategoryName
    }
  }
`);

export function getOriginalCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): MovableNoteCategory | undefined {
  const data = cache.readQuery({
    query: OriginalCategoryName_Query,
    variables: {
      by,
    },
  });

  if (!data) {
    return;
  }

  if (data.userNoteLink.originalCategoryName) {
    return data.userNoteLink.originalCategoryName;
  }

  if (data.userNoteLink.categoryName !== NoteCategory.TRASH) {
    return data.userNoteLink.categoryName as unknown as MovableNoteCategory;
  }

  return;
}

/**
 * Update field `originalCategoryName` with value from `categoryName`
 * as long as it's not `TRASH`
 */
export function updateOriginalCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  cache.updateQuery(
    {
      query: OriginalCategoryName_Query,
      variables: {
        by,
      },
    },
    (data) => {
      if (!data) {
        return;
      }

      if (data.userNoteLink.categoryName === NoteCategory.TRASH) {
        return;
      }

      return {
        ...data,
        userNoteLink: {
          ...data.userNoteLink,
          originalCategoryName: data.userNoteLink
            .categoryName as unknown as MovableNoteCategory,
        },
      };
    }
  );
}
