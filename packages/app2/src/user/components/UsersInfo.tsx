import { CurrentUserInfo } from './CurrentUserInfo';
import { UsersList } from './UsersList';
import { SignInProvidersList } from './SignInProvidersList';
import { SignOutAllUsersButton } from './SignOutAllUsersButton';
import { UserInfoTitleRow } from '../styled-components/UserInfoTitleRow';
import { UserInfoRow } from '../styled-components/UserInfoRow';
import { UsersInfoColumn } from '../styled-components/UsersInfoColumn';
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
