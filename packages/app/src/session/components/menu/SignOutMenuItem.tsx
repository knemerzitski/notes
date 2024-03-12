import { MenuItem } from '@mui/material';

import { useSession } from '../../context/SessionProvider';
import useSignOut from '../../hooks/useSignOut';

export default function SignOutMenuItem() {
  const signOut = useSignOut();
  const session = useSession();

  if (session.isExpired) return null;

  return (
    <MenuItem
      onClick={() => {
        void signOut(session);
      }}
    >
      Sign out
    </MenuItem>
  );
}
