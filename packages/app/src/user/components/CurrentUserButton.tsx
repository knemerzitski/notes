import { IconButtonProps, IconButton, Tooltip } from '@mui/material';

import { BadgeIfSessionExpired } from './BadgeIfSessionExpired';
import { UserAvatar } from './UserAvatar';

export function CurrentUserButton(props?: IconButtonProps) {
  return (
    <IconButton color="inherit" {...props} aria-label="open accounts">
      <Tooltip title="Accounts">
        <span>
          <BadgeIfSessionExpired>
            <UserAvatar />
          </BadgeIfSessionExpired>
        </span>
      </Tooltip>
    </IconButton>
  );
}
