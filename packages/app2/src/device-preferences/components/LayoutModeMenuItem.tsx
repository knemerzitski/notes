import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  css,
  styled,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useSelectNavigableMenu } from '../../utils/context/navigable-menu';
import { SettingsButtonMenuKey } from '../../utils/components/SettingsButton';
import { LayoutModeText } from './LayoutModeText';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';

export function LayoutModeMenuItem() {
  const selectMenu = useSelectNavigableMenu();

  function handleClickItem() {
    selectMenu({ type: 'custom', value: 'layout' satisfies SettingsButtonMenuKey });
  }

  return (
    <MenuItem aria-label="layout" onClick={handleClickItem}>
      <ListItemIcon>
        <ViewQuiltIcon />
      </ListItemIcon>
      <ListItemText>
        <Typography variant="body2">
          Layout: <LayoutModeText />
        </Typography>
      </ListItemText>
      <ListItemIconStyled>
        <NavigateNextIcon />
      </ListItemIconStyled>
    </MenuItem>
  );
}

export const ListItemIconStyled = styled(ListItemIcon)(css`
  justify-content: right;
`);
