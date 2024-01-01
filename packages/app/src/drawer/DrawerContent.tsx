import FolderIcon from '@mui/icons-material/Folder';
import QuizIcon from '@mui/icons-material/Quiz';
import {
  Box,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  BoxProps,
} from '@mui/material';

import { useDrawerExpanded } from './components/Drawer';
import useIsMobile from '../hooks/useIsMobile';
import { useProxyIsPathname, useProxyNavigate } from '../router/ProxyRoutesProvider';

interface DrawerContentProps extends BoxProps {
  onClose: () => void;
}

export function DrawerContent({ onClose, ...restProps }: DrawerContentProps) {
  const isMobile = useIsMobile();
  const expanded = useDrawerExpanded();
  const navigate = useProxyNavigate();

  //const isRootPathname = useProxyIsPathname('/');
  // {
  //   icon: <FolderIcon />,
  //   text: 'Notes',
  //   onClick: () => {
  //     navigate('/');
  //   },
  //   active: isRootPathname,
  // }

  const items = [
    {
      icon: <FolderIcon />,
      text: 'Local Notes',
      onClick: () => {
        navigate('/');
      },
      active: useProxyIsPathname('/'),
    },
  ];

  function handleClickItem() {
    if (isMobile) {
      onClose();
    }
  }

  return (
    <Box {...restProps} sx={{ overflowY: 'auto', overflowX: 'hidden', ...restProps.sx }}>
      <List>
        {items.map((item, index) => (
          <ListItemButton
            key={index}
            onClick={() => {
              item.onClick();
              handleClickItem();
            }}
            sx={(theme) => ({
              minHeight: theme.spacing(6),
              boxSizing: 'border-box',
              borderRadius: 6,
              ...(item.active && {
                backgroundColor: 'action.selected',
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              }),
            })}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                ml: -0.5,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              sx={{
                ml: expanded ? 2 : 'auto',
                opacity: expanded ? 1 : 0,
              }}
            >
              {item.text}
            </ListItemText>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
