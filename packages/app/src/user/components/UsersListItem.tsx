import {
  ListItemAvatar,
  ListItemText,
  Box,
  ListItemButton,
  Badge,
  css,
  IconButton,
  styled,
} from '@mui/material';

import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { UserAvatar } from './UserAvatar';
import { SessionExpired } from './SessionExpired';
import { EmailSubtitleSmall } from './EmailSubtitleSmall';
import { DisplayName } from './DisplayName';
import { useUserId } from '../context/user-id';
import { UserMoreOptionsButton } from './UserMoreOptionsButton';
import { useOnClose } from '../../utils/context/on-close';
import { setCurrentUser } from '../models/signed-in-user/set-current';
import { ActivableListItem } from '../../utils/components/ActivableListItem';

const UserListItem_Query = gql(`
  query UserListItem_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      public {
        id
        profile {
          displayName
        }
      }
      email
      local {
        id
        sessionExpired
      }
      localOnly
    }
  }
`);

export function UserListItem(props?: Parameters<typeof ActivableListItem>[0]) {
  const client = useApolloClient();
  const closeParent = useOnClose();

  const userId = useUserId();
  const { data } = useQuery(UserListItem_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUser;
  if (!user) return null;

  const name = user.public.profile.displayName;

  function handleClickUser() {
    setCurrentUser(userId, client.cache);
    closeParent();
  }

  return (
    <ActivableListItem {...props}>
      <ListItemButton onClick={handleClickUser}>
        <ListItemAvatar>
          <UserAvatar />
        </ListItemAvatar>
        <ListItemText>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <DisplayName>{name}</DisplayName>
            {user.local.sessionExpired && (
              <SessionExpired>Session expired</SessionExpired>
            )}
          </Box>
          {!user.localOnly && <EmailSubtitleSmall>{user.email}</EmailSubtitleSmall>}
        </ListItemText>
        <UserMoreOptionsButton
          iconButtonMenuProps={{
            slots: {
              iconButton: MoreOptionsIconButton,
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
    </ActivableListItem>
  );
}

const MoreOptionsIconButton = styled(IconButton)(css`
  align-self: flex-start;
`);
