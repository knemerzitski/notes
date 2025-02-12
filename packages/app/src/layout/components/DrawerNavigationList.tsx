import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import NoteIcon from '@mui/icons-material/Note';
import { List } from '@mui/material';

import { DrawerNavListItemButton } from './DrawerNavListItemButton';

export function DrawerNavigationList() {
  return (
    <List>
      <DrawerNavListItemButton to="/notes" icon={<NoteIcon />} text="Notes" />
      <DrawerNavListItemButton to="/archive" icon={<ArchiveIcon />} text="Archive" />
      <DrawerNavListItemButton to="/trash" icon={<DeleteIcon />} text="Trash" />
      <DrawerNavListItemButton to="/about" icon={<InfoIcon />} text="About" />
    </List>
  );
}
