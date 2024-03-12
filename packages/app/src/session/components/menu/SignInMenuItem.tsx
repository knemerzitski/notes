import { MenuItem, MenuItemProps } from '@mui/material';
import { MouseEvent } from 'react';

import { useCloseable } from '../../context/CloseableProvider';
import { useSession } from '../../context/SessionProvider';


export default function SignInMenuItem({ onClick, ...restProps }: MenuItemProps) {
  const session = useSession();
  const closeMenu = useCloseable();

  function handleClick(e: MouseEvent<HTMLLIElement>) {
    closeMenu();
    onClick?.(e);
  }

  if (!session.isExpired) return null;

  return (
    <>
      <MenuItem onClick={handleClick} {...restProps}>
        Sign in
      </MenuItem>
    </>
  );
}
