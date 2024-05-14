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
import useIsMobile from '../../common/hooks/useIsMobile';

export interface MoreOptionsButtonProps {
  iconButtonProps?: IconButtonProps;
  onOpened?: () => void;
  onClosed?: () => void;
  onDelete?: () => Promise<boolean>;
}

export default function MoreOptionsButton({
  iconButtonProps,
  onOpened,
  onClosed,
  onDelete,
}: MoreOptionsButtonProps) {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isMobile = useIsMobile();

  const menuOpen = anchorEl != null;

  function handleClickButton(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    onOpened?.();
  }

  function handleClose(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    setAnchorEl(null);
  }

  function handleClosed() {
    onClosed?.();
  }

  async function handleClickDelete(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    if (menuOpen && ((await onDelete?.()) ?? true)) {
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
        onClick={handleClickButton}
        {...iconButtonProps}
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
            <MenuItem
              onClick={(e) => {
                void handleClickDelete(e);
              }}
            >
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
          <MenuItem
            onClick={(e) => {
              void handleClickDelete(e);
            }}
          >
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
