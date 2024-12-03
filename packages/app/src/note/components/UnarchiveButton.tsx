import { useQuery } from '@apollo/client';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';
import { useUnarchiveNoteWithUndo } from '../hooks/useUnarchiveNoteWithUndo';
import { toMovableNoteCategory } from '../utils/note-category';

const UnarchiveButton_Query = gql(`
  query UnarchiveButton_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      categoryName
    }
  }
`);

export function UnarchiveButton() {
  const noteId = useNoteId();
  const unarchiveNoteWithUndo = useUnarchiveNoteWithUndo();

  const { data } = useQuery(UnarchiveButton_Query, {
    variables: {
      id: noteId,
    },
  });

  if (!data) {
    return null;
  }

  const category = toMovableNoteCategory(data.userNoteLink.categoryName);

  if (!category || category === MovableNoteCategory.DEFAULT) {
    return null;
  }

  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    unarchiveNoteWithUndo();
  };

  return (
    <IconButton onClick={handleClick} aria-label="unarchive note">
      <Tooltip title="Unarchive">
        <UnarchiveIcon />
      </Tooltip>
    </IconButton>
  );
}
