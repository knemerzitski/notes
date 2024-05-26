import { List, ListProps } from '@mui/material';

import UserListItem, { UserListItemProps } from './UserListItem';

interface UsersListProps extends ListProps {
  users: UserListItemProps['user'][];
  selectedUser?: Pick<UserListItemProps['user'], 'id'>;
}

export default function UsersList({ users, selectedUser, ...restProps }: UsersListProps) {
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
