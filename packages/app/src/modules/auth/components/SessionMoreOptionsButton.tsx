import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { IconButton, IconButtonProps, Menu } from '@mui/material';
import { useId, useState, MouseEvent, ReactNode } from 'react';

import CloseableProvider from '../context/CloseableProvider';

interface SessionMoreOptionsButtonProps extends IconButtonProps {
  children: ReactNode;
  iconButtonProps?: IconButtonProps;
}

export default function SessionMoreOptionsButton({
  children,
  iconButtonProps,
}: SessionMoreOptionsButtonProps) {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = anchorEl != null;

  function handleMouseDown(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleOpen(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleClickMenu(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="account options menu"
        size="medium"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onMouseDown={handleMouseDown}
        onClick={handleOpen}
        {...iconButtonProps}
      >
        <MoreHorizIcon />
      </IconButton>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
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
          handleClickMenu(e);
        }}
      >
        <CloseableProvider onClose={handleClose}>{children}</CloseableProvider>
      </Menu>
    </>
  );
}
