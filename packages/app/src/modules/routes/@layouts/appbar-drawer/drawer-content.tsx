import ArchiveIcon from '@mui/icons-material/Archive';
import FolderIcon from '@mui/icons-material/Folder';
import NoteIcon from '@mui/icons-material/Note';
import {
  Box,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  BoxProps,
} from '@mui/material';

import { useIsSignedIn } from '../../../auth/hooks/use-is-signedin';
import { useDrawerExpanded } from '../../../common/components/drawer';
import { useIsMobile } from '../../../common/hooks/use-is-mobile';
import {
  useProxyIsPathname,
  useProxyNavigate,
} from '../../../router/context/proxy-routes-provider';

interface DrawerContentProps extends BoxProps {
  onClose: () => void;
}

export function DrawerContent({ onClose, ...restProps }: DrawerContentProps) {
  const isSignedIn = useIsSignedIn();

  const isMobile = useIsMobile();
  const expanded = useDrawerExpanded();
  const navigate = useProxyNavigate();

  const isRootPathname = useProxyIsPathname('/');
  const isArchivePathname = useProxyIsPathname('/archive');
  const isLocalPathname = useProxyIsPathname('/local');

  const items = [
    {
      icon: <FolderIcon />,
      text: 'Local Notes',
      onClick: () => {
        navigate('/local');
      },
      active: isLocalPathname,
    },
  ];

  if (isSignedIn) {
    items.unshift(
      {
        icon: <NoteIcon />,
        text: 'Notes',
        onClick: () => {
          navigate('/');
        },
        active: isRootPathname,
      },
      {
        icon: <ArchiveIcon />,
        text: 'Archive',
        onClick: () => {
          navigate('/archive');
        },
        active: isArchivePathname,
      }
    );
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
