import { Box, Divider } from '@mui/material';

import { CurrentUserInfo } from './CurrentUserInfo';
import { SignInProvidersList } from './SignInProvidersList';
import { SignOutAllUsersButton } from './SignOutAllUsersButton';
import { UserInfoRow } from './UserInfoRow';
import { UserInfoTitleRow } from './UserInfoTitleRow';
import { UsersInfoColumn } from './UsersInfoColumn';
import { UsersList } from './UsersList';

export function UsersInfo() {
  return (
    <UsersInfoColumn>
      <UserInfoTitleRow>
        <CurrentUserInfo />
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
