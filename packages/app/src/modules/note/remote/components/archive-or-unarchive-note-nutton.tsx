import { useQuery } from '@apollo/client';

import { gql } from '../../../../__generated__';
import { NoteCategory } from '../../../../__generated__/graphql';
import { useNoteContentId } from '../context/note-content-id-provider';

import { ArchvieButtonProps, ArchiveNoteButton } from './archive-note-button';
import { UnarchvieButtonProps, UnarchiveNoteButton } from './unarchive-note-button';

export type ArchiveOrUnarchiveNoteButtonProps = ArchvieButtonProps & UnarchvieButtonProps;

const QUERY = gql(`
  query ArchiveOrUnarchiveNoteButton($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      categoryName
    }
  }
`);

export function ArchiveOrUnarchiveNoteButton(
  props: ArchiveOrUnarchiveNoteButtonProps
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
