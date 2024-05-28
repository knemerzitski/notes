import {
  MenuItem,
  ListItemText,
  ListItemIcon,
  MenuList,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import useColorMode from '../../preferences/hooks/useColorMode';
import { ColorMode } from '../../../__generated__/graphql';

const colorModes = [
  {
    text: 'Use device theme',
    value: ColorMode.System,
  },
  {
    text: 'Light theme',
    value: ColorMode.Light,
  },
  {
    text: 'Dark theme',
    value: ColorMode.Dark,
  },
];

interface AppearanceMenuListProps {
  onSelected?: () => void;
}

export default function AppearanceMenuList({ onSelected }: AppearanceMenuListProps) {
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