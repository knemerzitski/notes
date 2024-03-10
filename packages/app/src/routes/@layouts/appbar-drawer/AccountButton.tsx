import { useMutation, useSuspenseQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import {
  IconButton,
  Avatar,
  IconButtonProps,
  ListItemText,
  Popover,
  Typography,
  ListItemAvatar,
  List,
  ListItem,
  Box,
  Button,
  Badge,
  ListItemButton,
} from '@mui/material';
import { useId, useState } from 'react';

import { gql } from '../../../__generated__/gql';
import { AuthProvider, SavedSession } from '../../../__generated__/graphql';
import { SignInButton as SignInWithGoogleButton } from '../../../auth/google/oauth2';
import BackgroundLetterAvatar from '../../../components/data/BackgroundLetterAvatar';
import { useSnackbarError } from '../../../components/feedback/SnackbarAlertProvider';
import useLocalStateSessions from '../../../local-state/session/hooks/useLocalStateSessions';
import useSwitchToSession from '../../../local-state/session/hooks/useSwitchToSession';

const SIGN_IN = gql(`
  mutation SignIn($input: SignInInput!)  {
    signIn(input: $input) {
      currentSessionKey
      userInfo {
        profile {
          displayName
        }
      }
      signInUserInfo {
        email
      }
    }
  }
`);

const SIGN_OUT = gql(`
  mutation SignOut {
    signOut {
      signedOut
      currentSessionKey
    }
  }
`);

const SWITCH_SESSION = gql(`
  mutation SwitchSession($input: SwitchToSessionInput!) {
    switchToSession(input: $input) {
      currentSessionKey
    }
  }
`);

const QUERY = gql(`
  query AccountButton {
    savedSessions @client {
      key
      displayName
      email
      isExpired
    }

    currentSavedSessionIndex @client

    currentSavedSession @client {
      key
      displayName
      email
      isExpired
    }
  }
`);

export default function AccountButton(props: IconButtonProps) {
  const {
    data: { savedSessions: sessions, currentSavedSession: currentSession },
  } = useSuspenseQuery(QUERY);

  const { updateSession, deleteSession } = useLocalStateSessions();

  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const localSwitchToSession = useSwitchToSession();
  const showError = useSnackbarError();

  const [signIn] = useMutation(SIGN_IN);
  const [signOut] = useMutation(SIGN_OUT);
  const [switchToSession] = useMutation(SWITCH_SESSION);

  const menuOpen = Boolean(anchorEl);

  async function handleClickSession(session: SavedSession) {
    if (session.isExpired) {
      session;
    } else {
      return handleSwitchSession(session);
    }
  }

  async function handleSwitchSession(session: SavedSession) {
    if (session.key !== currentSession?.key) {
      const { data } = await switchToSession({
        variables: {
          input: {
            switchToSessionKey: String(session.key),
          },
        },
      });

      if (!data) {
        showError('Failed to switch session');
        return;
      }

      const sessionKey = data.switchToSession.currentSessionKey;

      if (!(await localSwitchToSession(sessionKey))) {
        showError('Failed to switch session');
        return;
      }
    }

    setAnchorEl(null);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleSignInWithGoogle(response: google.accounts.id.CredentialResponse) {
    const signInPayload = await signIn({
      variables: {
        input: {
          provider: AuthProvider.Google,
          credentials: {
            token: response.credential,
          },
        },
      },
      context: {
        headers: {},
      },
    });

    if (!signInPayload.data?.signIn) {
      if (signInPayload.errors) {
        showError(signInPayload.errors.map((err) => err.message).join(';'));
      } else {
        showError('Failed to sign in');
      }
      return;
    }

    const {
      currentSessionKey,
      userInfo: {
        profile: { displayName },
      },
      signInUserInfo: { email },
    } = signInPayload.data.signIn;

    updateSession({
      key: currentSessionKey,
      displayName,
      email,
      isExpired: false,
    });

    await localSwitchToSession(currentSessionKey);

    setAnchorEl(null);
  }

  async function handleSignOut() {
    if (currentSession == null) return;

    const signOutPayload = await signOut();
    if (!signOutPayload.data) return;

    const { signedOut, currentSessionKey: newSessionKey } = signOutPayload.data.signOut;

    if (!signedOut) return;

    deleteSession(String(currentSession.key));

    await localSwitchToSession(newSessionKey ?? null);

    setAnchorEl(null);
  }

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="account options"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        {...props}
      >
        {currentSession?.isExpired ? (
          <Badge
            badgeContent="!"
            color="warning"
            sx={{
              '& .MuiBadge-badge': {
                right: 4,
                top: 5,
              },
            }}
          >
            <BackgroundLetterAvatar name={currentSession.displayName} />
          </Badge>
        ) : currentSession ? (
          <BackgroundLetterAvatar name={currentSession.displayName} />
        ) : (
          <Avatar>
            <PersonIcon />
          </Avatar>
        )}
      </IconButton>

      <Popover
        open={menuOpen}
        anchorEl={anchorEl}
        keepMounted
        onClose={() => {
          setAnchorEl(null);
        }}
        disableScrollLock
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            elevation: 10,
            sx: {
              py: 2,
              borderRadius: 3,
              width: 'min(400px, 100vw)',
            },
          },
        }}
      >
        <IconButton
          color="inherit"
          aria-label="close account options"
          onClick={handleClose}
          sx={(theme) => ({
            position: 'absolute',
            right: theme.spacing(1),
            top: theme.spacing(1),
          })}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            display: 'flex',
            pl: 2,
            my: 1,
            gap: 2,
            alignItems: 'center',
          }}
        >
          {currentSession ? (
            <BackgroundLetterAvatar
              name={currentSession.displayName}
              avatarProps={{
                sx: {
                  width: 64,
                  height: 64,
                  boxShadow: 3,
                },
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 64,
                height: 64,
                boxShadow: 3,
              }}
            >
              <PersonIcon
                sx={{
                  fontSize: 48,
                }}
              />
            </Avatar>
          )}
          <Box
            sx={{
              fontSize: '1.1em',
            }}
          >
            <Typography
              sx={{
                // mt: 1,
                fontSize: '1em',
                fontWeight: 'bold',
              }}
            >
              {currentSession ? currentSession.displayName : 'Local Account'}
            </Typography>
            {currentSession && (
              <Typography
                sx={{
                  fontSize: '0.9em',
                }}
              >
                {currentSession.email}
              </Typography>
            )}
          </Box>
        </Box>
        <List
          disablePadding
          sx={{
            my: 3,
            display: 'flex',
            flexDirection: 'column',
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          {sessions.map((session) => (
            <ListItem
              key={session.key}
              disablePadding
              onClick={() => void handleClickSession(session)}
              divider
            >
              <ListItemButton
                sx={{
                  ...(session.key === currentSession?.key && {
                    backgroundColor: 'action.selected',
                  }),
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
                          fontSize: '0.8em',
                          lineHeight: '0.8em',
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
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              alignSelf: 'flex-start',
              maxWidth: 192,
            }}
          >
            <SignInWithGoogleButton
              onCallback={(res) => {
                void handleSignInWithGoogle(res);
              }}
            />
          </Box>
          {currentSession && (
            <Button
              color="inherit"
              variant="text"
              onClick={() => {
                void handleSignOut();
              }}
              sx={{
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                px: 2,
                py: 1,
              }}
            >
              <LogoutIcon />
              Sign out
            </Button>
          )}
        </Box>
      </Popover>
    </>
  );
}
