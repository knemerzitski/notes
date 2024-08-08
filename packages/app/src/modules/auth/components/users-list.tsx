import { List, ListProps } from '@mui/material';

import { UserListItemProps, UserListItem } from './user-list-item';

interface UsersListProps extends ListProps {
  users: UserListItemProps['user'][];
  selectedUser?: Pick<UserListItemProps['user'], 'id'>;
}

export function UsersList({ users, selectedUser, ...restProps }: UsersListProps) {
  return (
    <>
      <List
        disablePadding
        {...restProps}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          ...restProps.sx,
        }}
      >
        {users.map((user) => (
          <UserListItem
            key={user.id}
            user={user}
            divider
            disablePadding
            sx={{
              alignItems: 'stretch',
              ...(user.id === selectedUser?.id && {
                backgroundColor: 'action.selected',
              }),
            }}
          />
        ))}
      </List>
    </>
  );
}
