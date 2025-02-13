import { useFragment } from '@apollo/client';
import RestoreIcon from '@mui/icons-material/Restore';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { gql } from '../../__generated__';

import { NoteCategory } from '../../__generated__/graphql';
import { useOnClose } from '../../utils/context/on-close';
import { useNoteId } from '../context/note-id';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useRestoreNoteWithUndo } from '../hooks/useRestoreNoteWithUndo';

const RestoreNoteMenuItem_UserNoteLinkFragment = gql(`
  fragment RestoreNoteMenuItem_UserNoteLinkFragment on UserNoteLink {
    id
    categoryName
  }
`);

export function RestoreNoteMenuItem() {
  const closeMenu = useOnClose();
  const restoreNoteWithUndo = useRestoreNoteWithUndo();

  const noteId = useNoteId();
  const userNoteLinkId = useUserNoteLinkId();

  const { complete, data: userNoteLink } = useFragment({
    fragment: RestoreNoteMenuItem_UserNoteLinkFragment,
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
    restoreNoteWithUndo(noteId);
    closeMenu();
  }

  return (
    <MenuItem aria-label="restore note" onClick={handleClick}>
      <ListItemIcon>
        <RestoreIcon />
      </ListItemIcon>
      <ListItemText>Restore</ListItemText>
    </MenuItem>
  );
}
