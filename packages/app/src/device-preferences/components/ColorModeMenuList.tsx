import CheckIcon from '@mui/icons-material/Check';
import {
  MenuItem,
  ListItemText,
  ListItemIcon,
  MenuList,
  Typography,
} from '@mui/material';
import { ColorMode } from '../../__generated__/graphql';
import { useColorMode } from '../hooks/useColorMode';
import { useSelectNavigableMenu } from '../../utils/context/navigable-menu';

export const colorModes = [
  {
    text: 'Use device theme',
    value: ColorMode.SYSTEM,
  },
  {
    text: 'Light theme',
    value: ColorMode.LIGHT,
  },
  {
    text: 'Dark theme',
    value: ColorMode.DARK,
  },
] as const;

export function ColorModeMenuList() {
  const [colorMode, setColorMode] = useColorMode();
  const selectMenu = useSelectNavigableMenu();

  function handleSelectedColorMode(newColorMode: ColorMode) {
    if (colorMode === newColorMode) {
      return;
    }

    setColorMode(newColorMode);

    selectMenu({ type: 'none' });
  }

  return (
    <MenuList>
      {colorModes.map(({ text, value }) => (
        <MenuItem
          key={value}
          aria-label={text}
          onClick={() => {
            handleSelectedColorMode(value);
          }}
        >
          <ListItemIcon>
            <CheckIcon visibility={colorMode === value ? 'visible' : 'hidden'} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">{text}</Typography>
          </ListItemText>
        </MenuItem>
      ))}
    </MenuList>
  );
}
