import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';
import { toMovableNoteCategory } from '../utils/note-category';

import { ArchiveButton } from './ArchiveButton';
import { UnarchiveButton } from './UnarchiveButton';
import { useUserId } from '../../user/context/user-id';

const ArchiveOrUnarchiveButton_Query = gql(`
  query ArchiveOrUnarchiveButton_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }
    }
  }
`);

export function ArchiveOrUnarchiveButton() {
  const userId = useUserId();
  const noteId = useNoteId();

  const { data } = useQuery(ArchiveOrUnarchiveButton_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  const category = toMovableNoteCategory(data.signedInUser.noteLink.categoryName);

  if (!category) {
    return null;
  }

  if (category !== MovableNoteCategory.ARCHIVE) {
    return <ArchiveButton />;
  } else {
    return <UnarchiveButton />;
  }
}
