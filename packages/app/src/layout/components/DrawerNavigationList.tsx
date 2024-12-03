import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import NoteIcon from '@mui/icons-material/Note';
import { List } from '@mui/material';

import { DrawerNavListItemButton } from './DrawerNavListItemButton';

export function DrawerNavigationList() {
  return (
    <List>
      <DrawerNavListItemButton to="/notes" icon={<NoteIcon />} text="Notes" />
      <DrawerNavListItemButton to="/archive" icon={<ArchiveIcon />} text="Archive" />
      <DrawerNavListItemButton to="/trash" icon={<DeleteIcon />} text="Trash" />
    </List>
  );
}
