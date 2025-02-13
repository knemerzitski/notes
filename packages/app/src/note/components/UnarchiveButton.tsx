import { useQuery } from '@apollo/client';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { useUnarchiveNoteWithUndo } from '../hooks/useUnarchiveNoteWithUndo';
import { toMovableNoteCategory } from '../utils/note-category';

const UnarchiveButton_Query = gql(`
  query UnarchiveButton_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }
    }
  }
`);

export function UnarchiveButton() {
  const userId = useUserId();
  const noteId = useNoteId();
  const unarchiveNoteWithUndo = useUnarchiveNoteWithUndo();

  const { data } = useQuery(UnarchiveButton_Query, {
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

  if (!category || category === MovableNoteCategory.DEFAULT) {
    return null;
  }

  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    unarchiveNoteWithUndo(noteId);
  };

  return (
    <IconButton onClick={handleClick} aria-label="unarchive note">
      <Tooltip title="Unarchive">
        <UnarchiveIcon />
      </Tooltip>
    </IconButton>
  );
}
