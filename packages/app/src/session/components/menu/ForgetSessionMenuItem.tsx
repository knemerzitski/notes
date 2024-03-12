import { MenuItem } from '@mui/material';

import { useSession } from '../../context/SessionProvider';
import useForgetSession from '../../hooks/useForgetSession';

export default function ForgetSessionMenuItem() {
  const forgetSession = useForgetSession();
  const session = useSession();

  if (!session.isExpired) return null;

  return (
    <MenuItem
      onClick={() => {
        forgetSession(session);
      }}
    >
      Forget session
    </MenuItem>
  );
}
