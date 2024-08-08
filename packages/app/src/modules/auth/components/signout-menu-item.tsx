import { MenuItem } from '@mui/material';

import { useUser } from '../context/user-provider';
import { useSignOut } from '../hooks/use-sign-out';

export function SignOutMenuItem() {
  const signOut = useSignOut();
  const user = useUser();

  if (user.isSessionExpired) return null;

  return (
    <MenuItem
      onClick={() => {
        void signOut(String(user.id));
      }}
    >
      Sign out
    </MenuItem>
  );
}
