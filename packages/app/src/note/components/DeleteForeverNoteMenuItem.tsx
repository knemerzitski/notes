import { useFragment } from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { useOnClose } from '../../utils/context/on-close';
import { useNoteId } from '../context/note-id';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useDeleteNoteWithConfirm } from '../hooks/useDeleteNoteWithConfirm';

const DeleteForeverNoteMenuItem_UserNoteLinkFragment = gql(`
  fragment DeleteForeverNoteMenuItem_UserNoteLinkFragment on UserNoteLink {
    id
    categoryName
  }
`);

export function DeleteForeverNoteMenuItem() {
  const closeMenu = useOnClose();
  const deleteNoteWithConfirm = useDeleteNoteWithConfirm();
  const noteId = useNoteId();

  const userNoteLinkId = useUserNoteLinkId();
  const { complete, data: userNoteLink } = useFragment({
    fragment: DeleteForeverNoteMenuItem_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    },
  });

  if (!complete) {
    return null;
  }

  if (userNoteLink.categoryName !== NoteCategory.TRASH) {
    return null;
  }

  function handleClick() {
    closeMenu();
    void deleteNoteWithConfirm(noteId);
  }

  return (
    <MenuItem aria-label="delete note forever" onClick={handleClick}>
      <ListItemIcon>
        <DeleteIcon />
      </ListItemIcon>
      <ListItemText>Delete forever</ListItemText>
    </MenuItem>
  );
}
