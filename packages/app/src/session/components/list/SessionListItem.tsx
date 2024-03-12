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

import { SavedSession } from '../../../__generated__/graphql';
import BackgroundLetterAvatar from '../../../components/data/BackgroundLetterAvatar';
import { useCloseable } from '../../context/CloseableProvider';
import SessionProvider from '../../context/SessionProvider';
import useSwitchSession from '../../hooks/useSwitchSession';
import SignInModal, { SignInModalProps } from '../SignInModal';
import ForgetSessionMenuItem from '../menu/ForgetSessionMenuItem';
import SessionMoreOptionsButton from '../menu/SessionMoreOptionsButton';
import SignInMenuItem from '../menu/SignInMenuItem';
import SignOutMenuItem from '../menu/SignOutMenuItem';

interface SessionListItemProps extends ListItemProps {
  session: SavedSession;
}

export default function SessionListItem({ session, ...restProps }: SessionListItemProps) {
  const switchSession = useSwitchSession();
  const onClose = useCloseable();

  const [signInModalOpen, setSignInModalOpen] = useState(false);

  async function handleClick() {
    if (session.isExpired) {
      setSignInModalOpen(true);
    } else {
      const sessionSwitchedSuccessfully = await switchSession(session);
      if (sessionSwitchedSuccessfully) {
        onClose();
      } else {
        setSignInModalOpen(true);
      }
    }
  }

  const handleCloseSignInModal: SignInModalProps['onClose'] = (result) => {
    console.log('closed', result);
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
            <BackgroundLetterAvatar name={session.displayName} />
          </ListItemAvatar>

          <ListItemText>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography fontWeight="bold">{session.displayName}</Typography>
              {session.isExpired && (
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
              {session.email}
            </Typography>
          </ListItemText>

          <SessionProvider session={session}>
            <SessionMoreOptionsButton
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
              <ForgetSessionMenuItem />
            </SessionMoreOptionsButton>
          </SessionProvider>
        </ListItemButton>
      </ListItem>

      <SignInModal
        sessionHint={session}
        open={signInModalOpen}
        onClose={handleCloseSignInModal}
      />
    </>
  );
}
