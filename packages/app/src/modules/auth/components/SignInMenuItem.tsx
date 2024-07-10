import { MenuItem, MenuItemProps } from '@mui/material';
import { MouseEvent } from 'react';

import { useCloseable } from '../context/CloseableProvider';
import { useUser } from '../context/UserProvider';

export default function SignInMenuItem({ onClick, ...restProps }: MenuItemProps) {
  const session = useUser();
  const closeMenu = useCloseable();

  function handleClick(e: MouseEvent<HTMLLIElement>) {
    closeMenu();
    onClick?.(e);
  }

  if (!session.isSessionExpired) return null;

  return (
    <>
      <MenuItem onClick={handleClick} {...restProps}>
        Sign in
      </MenuItem>
    </>
  );
}
