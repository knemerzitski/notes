import CheckIcon from '@mui/icons-material/Check';
import {
  MenuItem,
  ListItemText,
  ListItemIcon,
  MenuList,
  Typography,
} from '@mui/material';

import { ColorMode } from '../../../__generated__/graphql';
import { useColorMode } from '../../preferences/hooks/use-color-mode';

const colorModes = [
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
];

interface AppearanceMenuListProps {
  onSelected?: () => void;
}

export function AppearanceMenuList({ onSelected }: AppearanceMenuListProps) {
  const [colorMode, setColorMode] = useColorMode();

  return (
    <>
      <MenuList>
        {colorModes.map(({ text, value }) => (
          <MenuItem
            key={value}
            onClick={() => {
              setColorMode(value);
              onSelected?.();
            }}
          >
            {colorMode === value && (
              <>
                <ListItemIcon>
                  <CheckIcon />
                </ListItemIcon>
              </>
            )}
            <ListItemText inset={colorMode !== value}>
              <Typography variant="body2">{text}</Typography>
            </ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    </>
  );
}
