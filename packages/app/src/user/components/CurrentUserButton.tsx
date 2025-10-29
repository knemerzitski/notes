import { IconButtonProps, IconButton, Tooltip } from '@mui/material';

import { forwardRef } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../context/user-id';

import { useIsLocalOnlyUser } from '../hooks/useIsLocalOnlyUser';

import { BadgeIfSessionExpired } from './BadgeIfSessionExpired';
import { UserAvatar } from './UserAvatar';

const _CurrentUserButton_UserFragment = gql(`
  fragment CurrentUserButton_UserFragment on User {
    ...UserAvatar_UserFragment
  }
`);

export const CurrentUserButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function CurrentUserButton(props, ref) {
    const userId = useUserId();
    const isLocalOnlyUser = useIsLocalOnlyUser();
    return (
      <IconButton
        ref={ref}
        color="inherit"
        {...props}
        aria-label="current user button"
        data-is-local={isLocalOnlyUser}
        data-user-id={userId}
      >
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
