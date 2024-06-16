import { IconButtonProps } from '@mui/material';
import { useId, useState, MouseEvent } from 'react';

import CloseableProvider from '../context/CloseableProvider';

import CurrentUserButton from './CurrentUserButton';
import UsersContainerPopover, {
  UsersContainerPopoverProps,
} from './UsersContainerPopover';

interface UserContainerPopoverButtonProps {
  buttonProps?: IconButtonProps;
  popoverProps?: Omit<UsersContainerPopoverProps, 'open' | 'onClose' | 'anchorEl'>;
}

export default function UserContainerPopoverButton({
  buttonProps,
  popoverProps,
}: UserContainerPopoverButtonProps) {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = Boolean(anchorEl);

  function handleClickButton(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  // this must be called from deep down...
  function handleClosePopover() {
    setAnchorEl(null);
  }

  return (
    <>
      <CurrentUserButton
        id={buttonId}
        aria-label="manage accounts"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={handleClickButton}
        {...buttonProps}
      />

      <CloseableProvider onClose={handleClosePopover}>
        <UsersContainerPopover
          open={menuOpen}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          {...popoverProps}
        />
      </CloseableProvider>
    </>
  );
}
