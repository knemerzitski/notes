import { CurrentUserInfo } from './CurrentUserInfo';
import { UsersList } from './UsersList';
import { SignInProvidersList } from './SignInProvidersList';
import { SignOutAllUsersButton } from './SignOutAllUsersButton';
import { UserInfoTitleRow } from './UserInfoTitleRow';
import { UserInfoRow } from './UserInfoRow';
import { UsersInfoColumn } from './UsersInfoColumn';
import { Box, Divider } from '@mui/material';

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
