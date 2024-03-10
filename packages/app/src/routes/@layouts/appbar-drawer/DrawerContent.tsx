import { useSuspenseQuery } from '@apollo/client';
import FolderIcon from '@mui/icons-material/Folder';
import {
  Box,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  BoxProps,
} from '@mui/material';

import { gql } from '../../../__generated__/gql';
import { useDrawerExpanded } from '../../../components/drawer/Drawer';
import useIsMobile from '../../../hooks/useIsMobile';
import {
  useProxyIsPathname,
  useProxyNavigate,
} from '../../../router/ProxyRoutesProvider';

interface DrawerContentProps extends BoxProps {
  onClose: () => void;
}

const QUERY = gql(`
  query DrawerContent {
    isSignedIn @client
  }
`);

export function DrawerContent({ onClose, ...restProps }: DrawerContentProps) {
  const {
    data: { isSignedIn },
  } = useSuspenseQuery(QUERY);

  const isMobile = useIsMobile();
  const expanded = useDrawerExpanded();
  const navigate = useProxyNavigate();

  const isRootPathname = useProxyIsPathname('/');

  const items = [
    {
      icon: <FolderIcon />,
      text: 'Local Notes',
      onClick: () => {
        navigate('/local');
      },
      active: useProxyIsPathname('/local'),
    },
  ];

  if (isSignedIn) {
    items.unshift({
      icon: <FolderIcon />,
      text: 'Notes',
      onClick: () => {
        navigate('/');
      },
      active: isRootPathname,
    });
  }

  items.push();

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
