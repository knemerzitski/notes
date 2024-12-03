import { useFragment } from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { useOnClose } from '../../utils/context/on-close';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useTrashNoteWithUndo } from '../hooks/useTrashNoteWithUndo';

const TrashDeleteNoteMenuItem_UserNoteLinkFragment = gql(`
  fragment TrashDeleteNoteMenuItem_UserNoteLinkFragment on UserNoteLink {
    id
    categoryName
  }
`);

export function TrashDeleteNoteMenuItem() {
  const closeMenu = useOnClose();
  const trashNoteWithUndo = useTrashNoteWithUndo();

  const userNoteLinkId = useUserNoteLinkId();
  const { complete, data: userNoteLink } = useFragment({
    fragment: TrashDeleteNoteMenuItem_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    },
  });

  if (!complete) {
    return null;
  }

  if (userNoteLink.categoryName === NoteCategory.TRASH) {
    return null;
  }

  function handleClick() {
    trashNoteWithUndo();
    closeMenu();
  }

  return (
    <MenuItem aria-label="delete note" onClick={handleClick}>
      <ListItemIcon>
        <DeleteIcon />
      </ListItemIcon>
      <ListItemText>Delete</ListItemText>
    </MenuItem>
  );
}
