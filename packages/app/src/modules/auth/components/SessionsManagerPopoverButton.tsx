import { IconButtonProps } from '@mui/material';
import { useId, useState, MouseEvent } from 'react';

import CloseableProvider from '../context/CloseableProvider';
import CurrentSessionButton from './CurrentSessionButton';

import SessionsManagementPopover, {
  SessionsManagementPopoverProps,
} from './SessionsManagerPopover';

interface SessionsManagementButtonProps {
  buttonProps?: IconButtonProps;
  popoverProps?: Omit<SessionsManagementPopoverProps, 'open' | 'onClose' | 'anchorEl'>;
}

export default function SessionsManagerButton({
  buttonProps,
  popoverProps,
}: SessionsManagementButtonProps) {
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
      <CurrentSessionButton
        id={buttonId}
        aria-label="manage accounts"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={handleClickButton}
        {...buttonProps}
      />

      <CloseableProvider onClose={handleClosePopover}>
        <SessionsManagementPopover
          open={menuOpen}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          {...popoverProps}
        />
      </CloseableProvider>
    </>
  );
}
