import { useQuery } from '@apollo/client';
import { IconButtonProps, IconButton, Tooltip } from '@mui/material';
import { gql } from '../../__generated__';
import { BadgeIfSessionExpired } from './BadgeIfSessionExpired';
import { UserAvatar } from './UserAvatar';
import { UserIdProvider } from '../context/user-id';

const CurrentUserButton_Query = gql(`
  query CurrentUserButton_Query {
    currentSignedInUser @client {
      id
    }
  }
`);

export function CurrentUserButton(props?: IconButtonProps) {
  const { data } = useQuery(CurrentUserButton_Query);
  if (!data) return null;

  const user = data.currentSignedInUser;

  return (
    <UserIdProvider userId={user.id}>
      <IconButton color="inherit" {...props} aria-label="open accounts">
        <Tooltip title="Accounts">
          <span>
            <BadgeIfSessionExpired>
              <UserAvatar />
            </BadgeIfSessionExpired>
          </span>
        </Tooltip>
      </IconButton>
    </UserIdProvider>
  );
}
