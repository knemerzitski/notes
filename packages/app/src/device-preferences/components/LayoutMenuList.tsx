import CheckIcon from '@mui/icons-material/Check';
import {
  MenuItem,
  ListItemText,
  ListItemIcon,
  MenuList,
  Typography,
} from '@mui/material';

import { LayoutMode } from '../../__generated__/graphql';
import { useSelectNavigableMenu } from '../../utils/context/navigable-menu';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { layoutModes } from '../utils/layout-modes';

export function LayoutMenuList() {
  const [layoutMode, setLayoutMode] = useLayoutMode();
  const selectMenu = useSelectNavigableMenu();

  function handleSelectedLayoutMode(newLayoutMode: LayoutMode) {
    if (layoutMode === newLayoutMode) {
      return;
    }

    setLayoutMode(newLayoutMode);

    selectMenu({ type: 'none' });
  }

  return (
    <MenuList>
      {layoutModes.map(({ text, value }) => (
        <MenuItem
          key={value}
          aria-label={text}
          onClick={() => {
            handleSelectedLayoutMode(value);
          }}
        >
          <ListItemIcon>
            <CheckIcon visibility={layoutMode === value ? 'visible' : 'hidden'} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">{text}</Typography>
          </ListItemText>
        </MenuItem>
      ))}
    </MenuList>
  );
}
