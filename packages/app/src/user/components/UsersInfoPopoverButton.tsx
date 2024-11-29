import { IconButtonProps } from '@mui/material';
import { useId, useState, MouseEvent } from 'react';
import { CurrentUserButton } from './CurrentUserButton';
import { UsersInfoPopover } from './UsersInfoPopover';
import { OnCloseProvider } from '../../utils/context/on-close';

export function UsersInfoPopoverButton({
  ButtonProps,
  PopoverProps,
}: {
  ButtonProps?: Omit<
    IconButtonProps,
    'id' | 'aria-label' | 'aria-controls' | 'aria-haspopup' | 'aria-expanded' | 'onClick'
  >;
  PopoverProps?: Omit<
    Parameters<typeof UsersInfoPopover>[0],
    'open' | 'onClose' | 'anchorEl'
  >;
}) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  function handleOpenPopover(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  function handleClosePopover() {
    setAnchorEl(null);
  }

  return (
    <>
      <CurrentUserButton
        {...ButtonProps}
        id={buttonId}
        aria-label="show accounts"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={handleOpenPopover}
      />

      <OnCloseProvider onClose={handleClosePopover}>
        <UsersInfoPopover
          {...PopoverProps}
          open={menuOpen}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
        />
      </OnCloseProvider>
    </>
  );
}
