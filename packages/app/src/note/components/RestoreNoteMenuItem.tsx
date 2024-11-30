import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { useOnClose } from '../../utils/context/on-close';
import { useRestoreNoteWithUndo } from '../hooks/useRestoreNoteWithUndo';
import RestoreIcon from '@mui/icons-material/Restore';
import { gql } from '../../__generated__';
import { useFragment } from '@apollo/client';
import {} from '../context/note-id';
import { NoteCategory } from '../../__generated__/graphql';
import { useUserNoteLinkId } from '../context/user-note-link-id';

const RestoreNoteMenuItem_UserNoteLinkFragment = gql(`
  fragment RestoreNoteMenuItem_UserNoteLinkFragment on UserNoteLink {
    categoryName
  }
`);

export function RestoreNoteMenuItem() {
  const closeMenu = useOnClose();
  const restoreNoteWithUndo = useRestoreNoteWithUndo();

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
    restoreNoteWithUndo();
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
