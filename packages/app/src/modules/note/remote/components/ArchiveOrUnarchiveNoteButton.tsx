import { useQuery } from '@apollo/client';

import { gql } from '../../../../__generated__';
import { NoteCategory } from '../../../../__generated__/graphql';
import { useNoteContentId } from '../context/NoteContentIdProvider';

import ArchiveNoteButton, { ArchvieButtonProps } from './ArchiveNoteButton';
import UnarchiveNoteButton, { UnarchvieButtonProps } from './UnarchiveNoteButton';

const QUERY = gql(`
  query ArchiveOrUnarchiveNoteButton($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      categoryName
    }
  }
`);

export default function ArchiveOrUnarchiveNoteButton(
  props: ArchvieButtonProps & UnarchvieButtonProps
) {
  const noteContentId = useNoteContentId(true);

  const { data } = useQuery(QUERY, {
    variables: {
      noteContentId: noteContentId ?? '',
    },
    fetchPolicy: 'cache-only',
  });

  if (data?.note.categoryName !== NoteCategory.ARCHIVE) {
    return <ArchiveNoteButton {...props} />;
  } else {
    return <UnarchiveNoteButton {...props} />;
  }
}
