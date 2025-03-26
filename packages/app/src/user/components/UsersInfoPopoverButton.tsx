import { IconButtonProps } from '@mui/material';
import { useId, useState, MouseEvent, forwardRef } from 'react';

import { gql } from '../../__generated__';
import { OnCloseProvider } from '../../utils/context/on-close';

import { CurrentUserButton } from './CurrentUserButton';
import { UsersInfoPopover } from './UsersInfoPopover';

const _UsersInfoPopoverButton_UserFragment = gql(`
  fragment UsersInfoPopoverButton_UserFragment on User {
    ...UsersInfoPopover_UserFragment
  }
`);

export const UsersInfoPopoverButton = forwardRef<
  HTMLButtonElement,
  Omit<
    IconButtonProps,
    'id' | 'aria-label' | 'aria-controls' | 'aria-haspopup' | 'aria-expanded' | 'onClick'
  > & {
    PopoverProps?: Omit<
      Parameters<typeof UsersInfoPopover>[0],
      'open' | 'onClose' | 'anchorEl'
    >;
  }
>(function UsersInfoPopoverButton({ PopoverProps, ...restProps }, ref) {
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
        ref={ref}
        {...restProps}
        id={buttonId}
        aria-label="show users"
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
});
