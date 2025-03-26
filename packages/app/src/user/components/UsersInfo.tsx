import { Box, Divider } from '@mui/material';

import { gql } from '../../__generated__';

import { SignInProvidersList } from './SignInProvidersList';
import { SignOutAllUsersButton } from './SignOutAllUsersButton';
import { UserInfo } from './UserInfo';
import { UserInfoRow } from './UserInfoRow';
import { UserInfoTitleRow } from './UserInfoTitleRow';
import { UsersInfoColumn } from './UsersInfoColumn';
import { UsersList } from './UsersList';

const _UsersInfo_UserFragment = gql(`
  fragment UsersInfo_UserFragment on User {
    ...UserInfo_UserFragment
  }
`);

export function UsersInfo() {
  return (
    <UsersInfoColumn aria-label="users info">
      <UserInfoTitleRow aria-label="current user">
        <UserInfo />
      </UserInfoTitleRow>

      <Box>
        <Divider />
        <UsersList />
      </Box>

      <Box>
        <SignInProvidersList />

        <UserInfoRow>
          <SignOutAllUsersButton />
        </UserInfoRow>
      </Box>
    </UsersInfoColumn>
  );
}
