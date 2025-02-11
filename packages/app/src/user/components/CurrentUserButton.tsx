import { IconButtonProps, IconButton, Tooltip } from '@mui/material';

import { forwardRef } from 'react';

import { BadgeIfSessionExpired } from './BadgeIfSessionExpired';
import { UserAvatar } from './UserAvatar';

export const CurrentUserButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function CurrentUserButton(props, ref) {
    return (
      <IconButton ref={ref} color="inherit" {...props} aria-label="open accounts">
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
);
