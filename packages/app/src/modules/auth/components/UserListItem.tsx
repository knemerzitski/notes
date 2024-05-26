import {
  ListItemAvatar,
  ListItemText,
  Box,
  Typography,
  ListItemProps,
  ListItem,
  ListItemButton,
} from '@mui/material';
import { useState } from 'react';

import { useCloseable } from '../context/CloseableProvider';
import UserProvider from '../context/UserProvider';
import useNavigateSwitchCurrentUser from '../hooks/useNavigateSwitchCurrentUser';
import SignInModal, { SignInModalProps } from './SignInModal';
import ForgetUserMenuItem from './ForgetUserMenuItem';
import UserMoreOptionsButton from './UserMoreOptionsButton';
import SignInMenuItem from './SignInMenuItem';
import SignOutMenuItem from './SignOutMenuItem';
import BackgroundLetterAvatar from '../../common/components/BackgroundLetterAvatar';
import { User } from '../../../__generated__/graphql';

export interface UserListItemProps extends ListItemProps {
  user: Pick<User, 'id' | 'isSessionExpired' | 'email' | 'authProviderEntries'> & {
    profile: Pick<User['profile'], 'displayName'>;
  };
}

export default function UserListItem({ user, ...restProps }: UserListItemProps) {
  const navigateSwitchCurrentUser = useNavigateSwitchCurrentUser();
  const onClose = useCloseable();

  const [signInModalOpen, setSignInModalOpen] = useState(false);

  async function handleClick() {
    if (user.isSessionExpired) {
      setSignInModalOpen(true);
    } else {
      await navigateSwitchCurrentUser(String(user.id));
      onClose();
    }
  }

  const handleCloseSignInModal: SignInModalProps['onClose'] = (result) => {
    setSignInModalOpen(false);
    if (result !== 'canceled') {
      onClose();
    }
  };

  return (
    <>
      <ListItem {...restProps}>
        <ListItemButton
          onClick={() => {
            void handleClick();
          }}
        >
          <ListItemAvatar>
            <BackgroundLetterAvatar name={user.profile.displayName} />
          </ListItemAvatar>

          <ListItemText>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography fontWeight="bold">{user.profile.displayName}</Typography>
              {user.isSessionExpired && (
                <Typography
                  sx={{
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    fontSize: '0.75em',
                    lineHeight: '0.75em',
                    p: 0.8,
                    borderRadius: 1,
                  }}
                >
                  Session expired
                </Typography>
              )}
            </Box>

            <Typography
              sx={{
                fontSize: '.9em',
              }}
            >
              {user.email}
            </Typography>
          </ListItemText>

          <UserProvider user={user}>
            <UserMoreOptionsButton
              iconButtonProps={{
                sx: {
                  alignSelf: 'flex-start',
                },
                color: 'inherit',
                edge: 'end',
              }}
            >
              <SignInMenuItem
                onClick={() => {
                  setSignInModalOpen(true);
                }}
              />
              <SignOutMenuItem />
              <ForgetUserMenuItem />
            </UserMoreOptionsButton>
          </UserProvider>
        </ListItemButton>
      </ListItem>

      <SignInModal
        userHint={user}
        open={signInModalOpen}
        onClose={handleCloseSignInModal}
      />
    </>
  );
}
