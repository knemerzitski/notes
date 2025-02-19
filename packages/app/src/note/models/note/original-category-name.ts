import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  MovableNoteCategory,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

import { toMovableNoteCategory } from '../../utils/note-category';

import { getCategoryName } from './category-name';

const OriginalCategoryName_Query = gql(`
  query OriginalCategoryName_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
        originalCategoryName
      }
    }
  }
`);

export function getOriginalCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): MovableNoteCategory | undefined {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  const data = cache.readQuery({
    query: OriginalCategoryName_Query,
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
    return;
  }

  if (data.signedInUser.noteLink.originalCategoryName) {
    return data.signedInUser.noteLink.originalCategoryName;
  }

  if (data.signedInUser.noteLink.categoryName !== NoteCategory.TRASH) {
    return data.signedInUser.noteLink.categoryName as unknown as MovableNoteCategory;
  }

  return;
}

/**
 * Update field `originalCategoryName` with value from `categoryName`
 * as long as it's not `TRASH`
 */
export function updateOriginalCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'updateQuery' | 'readQuery'>,
  originalCategoryName?: MovableNoteCategory
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: OriginalCategoryName_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
      },
    },
    (data) => {
      if (!data) {
        return;
      }

      if (data.signedInUser.noteLink.categoryName === NoteCategory.TRASH) {
        return;
      }

      const resultOriginalCategoryName =
        originalCategoryName ?? toMovableNoteCategory(getCategoryName(by, cache));
      if (!resultOriginalCategoryName) {
        return;
      }

      return {
        ...data,
        userNoteLink: {
          ...data.signedInUser.noteLink,
          originalCategoryName: resultOriginalCategoryName,
        },
      };
    }
  );
}
