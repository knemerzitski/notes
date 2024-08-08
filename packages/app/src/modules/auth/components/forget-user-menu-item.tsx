import { MenuItem } from '@mui/material';

import { useUser } from '../context/user-provider';
import { useForgetUser } from '../hooks/use-forget-user';

export function ForgetUserMenuItem() {
  const forgetUser = useForgetUser();
  const user = useUser();

  if (!user.isSessionExpired) return null;

  return (
    <MenuItem
      onClick={() => {
        forgetUser(String(user.id));
      }}
    >
      Forget
    </MenuItem>
  );
}
