import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useQuery } from '@apollo/client';
import { useArchiveNoteWithUndo } from '../hooks/useArchiveNoteWithUndo';
import { toMovableNoteCategory } from '../utils/note-category';
import ArchiveIcon from '@mui/icons-material/Archive';
import { MovableNoteCategory } from '../../__generated__/graphql';

const ArchiveButton_Query = gql(`
  query ArchiveButton_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      categoryName
    }
  }
`);

export function ArchiveButton() {
  const noteId = useNoteId();
  const archiveNoteWithUndo = useArchiveNoteWithUndo();

  const { data } = useQuery(ArchiveButton_Query, {
    variables: {
      id: noteId,
    },
  });

  if (!data) {
    return null;
  }

  const category = toMovableNoteCategory(data.userNoteLink.categoryName);

  if (!category || category === MovableNoteCategory.ARCHIVE) {
    return null;
  }

  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    archiveNoteWithUndo();
  };

  return (
    <IconButton onClick={handleClick} aria-label="archive note">
      <Tooltip title="Archive">
        <ArchiveIcon />
      </Tooltip>
    </IconButton>
  );
}
