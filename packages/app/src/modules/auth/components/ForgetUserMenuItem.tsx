import { MenuItem } from '@mui/material';

import { useUser } from '../context/UserProvider';
import useForgetUser from '../hooks/useForgetUser';

export default function ForgetUserMenuItem() {
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
