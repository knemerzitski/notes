import { ListItemAvatar, ListItemText, Box, ListItemButton, Badge } from '@mui/material';

import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { UserAvatar } from './UserAvatar';
import { SessionExpired } from '../styled-components/SessionExpired';
import { EmailSubtitleSmall } from '../styled-components/EmailSubtitleSmall';
import { DisplayName } from '../styled-components/DisplayName';
import { useUserId } from '../context/user-id';
import { UserMoreOptionsButton } from './UserMoreOptionsButton';
import { useOnClose } from '../../utils/context/on-close';
import { setCurrentUser } from '../utils/signed-in-user/set-current';
import { SelectableListItem } from '../../utils/styled-components/SelectableListItem';
import { StartIconButton } from '../../utils/styled-components/StartIconButton';

const UserListItem_Query = gql(`
  query UserListItem_Query($id: ID!) {
    signedInUserById(id: $id) @client {
      id
      public {
        profile {
          displayName
        }
      }
      email
      local {
        sessionExpired
      }
      localOnly
    }
  }
`);

export function UserListItem(props?: Parameters<typeof SelectableListItem>[0]) {
  const client = useApolloClient();
  const closeParent = useOnClose();

  const userId = useUserId();
  const { data } = useQuery(UserListItem_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUserById;
  if (!user) return null;

  const name = user.public.profile.displayName;

  function handleClickUser() {
    setCurrentUser(userId, client.cache);
    closeParent();
  }

  return (
    <SelectableListItem {...props}>
      <ListItemButton onClick={handleClickUser}>
        <ListItemAvatar>
          <UserAvatar />
        </ListItemAvatar>
        <ListItemText>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <DisplayName>{name}</DisplayName>
            {user.local.sessionExpired && <SessionExpired>Session expired</SessionExpired>}
          </Box>
          {!user.localOnly && <EmailSubtitleSmall>{user.email}</EmailSubtitleSmall>}
        </ListItemText>
        <UserMoreOptionsButton
          iconButtonMenuProps={{
            slots: {
              iconButton: StartIconButton,
            },
            slotProps: {
              iconButton: {
                color: 'inherit',
                edge: 'end',
              },
            },
          }}
        />
        <Badge slotProps={{ badge: { className: 'my-badge' } }} />
      </ListItemButton>
    </SelectableListItem>
  );
}
