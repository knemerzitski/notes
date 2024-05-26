import { MenuItem } from '@mui/material';

import { useUser } from '../context/UserProvider';
import useSignOut from '../hooks/useSignOut';

export default function SignOutMenuItem() {
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
