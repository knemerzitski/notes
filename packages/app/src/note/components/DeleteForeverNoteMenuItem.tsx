import { useFragment } from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { useOnClose } from '../../utils/context/on-close';
import { useShowConfirm } from '../../utils/context/show-confirm';
import { useNoteId } from '../context/note-id';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useDeleteNote } from '../hooks/useDeleteNote';


const DeleteForeverNoteMenuItem_UserNoteLinkFragment = gql(`
  fragment DeleteForeverNoteMenuItem_UserNoteLinkFragment on UserNoteLink {
    id
    categoryName
  }
`);

export function DeleteForeverNoteMenuItem() {
  const closeMenu = useOnClose();
  const deleteNote = useDeleteNote();
  const showConfirm = useShowConfirm();
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
    showConfirm('Delete note forever?', {
      onSuccess() {
        void deleteNote({
          noteId,
        });
      },
    });
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
