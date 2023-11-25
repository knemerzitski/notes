import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Dialog,
  IconButton,
  IconButtonProps,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useId, useState, MouseEvent, ReactElement, Ref, forwardRef } from 'react';

import useIsMobile from '../hooks/useIsMobile';

export interface MoreOptionsButtonProps extends IconButtonProps {
  onMenuOpened?: () => void;
  onMenuClosed?: () => void;
  onDelete?: () => Promise<boolean>;
}

export default function NoteMoreOptionsButton({
  onMenuOpened = () => {
    return;
  },
  onMenuClosed = () => {
    return;
  },
  onDelete = async () => Promise.resolve(true),
  ...restProps
}: MoreOptionsButtonProps) {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isMobile = useIsMobile();

  const menuOpen = anchorEl != null;

  function handleOpen(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    onMenuOpened();
  }

  function handleClose(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    setAnchorEl(null);
  }

  function handleClosed() {
    onMenuClosed();
  }

  async function handleDeleteClick(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    if (menuOpen && (await onDelete())) {
      handleClose(e);
      handleClosed();
    }
  }

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="note options menu"
        size="medium"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={handleOpen}
        {...restProps}
      >
        <MoreVertIcon />
      </IconButton>

      {isMobile ? (
        <Dialog
          id={menuId}
          open={menuOpen}
          onClose={handleClose}
          onTransitionExited={handleClosed}
          TransitionComponent={SlideUpTransition}
          PaperProps={{
            sx: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              m: 0,
              borderRadius: 0,
            },
          }}
        >
          <MenuList aria-labelledby={anchorEl?.id}>
            <MenuItem onClick={void handleDeleteClick}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete note</ListItemText>
            </MenuItem>
          </MenuList>
        </Dialog>
      ) : (
        <Menu
          id={menuId}
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleClose}
          onTransitionExited={handleClosed}
          MenuListProps={{
            'aria-labelledby': anchorEl?.id,
          }}
          transitionDuration={{
            appear: 200,
            enter: 200,
            exit: 0,
          }}
          disableScrollLock
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <MenuItem onClick={void handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete note</ListItemText>
          </MenuItem>
        </Menu>
      )}
    </>
  );
}

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});
