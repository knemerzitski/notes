import { gql } from '../../__generated__';
import { UserNoteLinkByInput } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { updateOriginalCategoryName } from '../models/note/original-category-name';
import { moveNoteInConnection } from '../models/note-connection/move';

export const TrashUserNoteLinkPayload = mutationDefinition(
  gql(`
    fragment TrashUserNoteLinkPayload on TrashUserNoteLinkPayload {
      userNoteLink {
        id
        deletedAt
        categoryName
      }
      originalCategoryName
    }
  `),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    const noteLink = data.userNoteLink;
    const noteBy: UserNoteLinkByInput = {
      id: noteLink.id,
    };

    // Remember category if its restored later
    updateOriginalCategoryName(noteBy, cache, data.originalCategoryName);

    moveNoteInConnection(
      noteBy,
      {
        categoryName: noteLink.categoryName,
      },
      cache
    );
  }
);
