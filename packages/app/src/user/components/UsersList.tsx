import { useQuery } from '@apollo/client';
import { ListProps } from '@mui/material';

import { gql } from '../../__generated__';
import { ColumnList } from '../../utils/components/ColumnList';

import { UserIdProvider, useUserId } from '../context/user-id';

import { UserListItem } from './UsersListItem';

const UsersList_Query = gql(`
  query UsersList_Query {
    signedInUsers {
      id
    }
  }
`);

export function UsersList({ listProps }: { listProps?: ListProps }) {
  const userId = useUserId();

  const { data } = useQuery(UsersList_Query, { fetchPolicy: 'cache-only' });
  if (!data) return null;

  const userIds = data.signedInUsers.map((user) => user.id);
  const selectedUserId = userId;

  return (
    <ColumnList disablePadding {...listProps} aria-label="users list">
      {userIds.map((userId) => (
        <UserIdProvider key={userId} userId={userId}>
          <UserListItem
            divider
            disablePadding
            active={userId === selectedUserId}
            aria-selected={userId === selectedUserId}
          />
        </UserIdProvider>
      ))}
    </ColumnList>
  );
}
