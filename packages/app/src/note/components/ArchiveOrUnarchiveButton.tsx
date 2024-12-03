import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';
import { toMovableNoteCategory } from '../utils/note-category';

import { ArchiveButton } from './ArchiveButton';
import { UnarchiveButton } from './UnarchiveButton';

const ArchiveOrUnarchiveButton_Query = gql(`
  query ArchiveOrUnarchiveButton_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      categoryName
    }
  }
`);

export function ArchiveOrUnarchiveButton() {
  const noteId = useNoteId();

  const { data } = useQuery(ArchiveOrUnarchiveButton_Query, {
    variables: {
      id: noteId,
    },
  });

  if (!data) {
    return null;
  }

  const category = toMovableNoteCategory(data.userNoteLink.categoryName);

  if (!category) {
    return null;
  }

  if (category !== MovableNoteCategory.ARCHIVE) {
    return <ArchiveButton />;
  } else {
    return <UnarchiveButton />;
  }
}
