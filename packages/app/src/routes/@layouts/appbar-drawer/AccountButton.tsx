import { useMutation, useSuspenseQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import {
  IconButton,
  Avatar,
  IconButtonProps,
  ListItemText,
  Popover,
  Typography,
  Paper,
  ListItemAvatar,
  List,
  ListItem,
  Box,
  Button,
} from '@mui/material';
import { useId, useState } from 'react';

import { gql } from '../../../local-state/__generated__/gql';
import { AuthProvider } from '../../../local-state/__generated__/graphql';
import { useSwitchToSession } from '../../../local-state/session/context/SessionSwitcherProvider';
import useSessions from '../../../local-state/session/hooks/useSessions';
import { useSnackbarError } from '../../../components/feedback/SnackbarAlertProvider';

const SIGN_IN = gql(`
  mutation SignIn($input: SignInInput!)  {
    signIn(input: $input) {
      sessionIndex
      userInfo {
        offlineMode {
          id
        }
        profile {
          displayName
        }
      }
    }
  }
`);

const SIGN_OUT = gql(`
  mutation SignOut {
    signOut {
      signedOut
      activeSessionIndex
    }
  }
`);

const QUERY = gql(`
  query AccountButton {
    savedSessions @client {
      displayName
      email
    }

    currentSavedSessionIndex @client
    
    currentSavedSession @client {
      displayName
      email
    }
  }
`);

export default function AccountButton(props: IconButtonProps) {
  const {
    data: {
      savedSessions: sessions,
      currentSavedSessionIndex: currentSessionIndex,
      currentSavedSession: currentSession,
    },
  } = useSuspenseQuery(QUERY);

  const {
    operations: { updateSession, deleteSession },
  } = useSessions();

  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const switchToSession = useSwitchToSession();
  const showError = useSnackbarError();

  const [signIn] = useMutation(SIGN_IN);
  const [signOut] = useMutation(SIGN_OUT);

  const menuOpen = Boolean(anchorEl);

  async function handleSwitchSession(index: number) {
    if (index !== currentSessionIndex) {
      if (!(await switchToSession(index))) {
        showError('Failed to switch session');
        return;
      }
    }

    setAnchorEl(null);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleSignInWithGoogle() {
    const signInPayload = await signIn({
      variables: {
        input: {
          provider: AuthProvider.Google,
          credentials: {
            // TODO use actual jwt token
            token: 'test-google-account' + ((currentSessionIndex ?? 0) + 1),
          },
        },
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
      sessionIndex,
      userInfo: {
        profile: { displayName },
      },
    } = signInPayload.data.signIn;

    updateSession(sessionIndex, {
      displayName,
      email: 'testaccount@gmail.com', // TODO email from google auth jwt response
    });

    await switchToSession(sessionIndex);
  }

  async function handleSignOut() {
    if (currentSessionIndex == null) return;

    const signOutPayload = await signOut();
    if (!signOutPayload.data) return;

    const { signedOut, activeSessionIndex: newSessionIndex } =
      signOutPayload.data.signOut;

    if (!signedOut) return;

    deleteSession(currentSessionIndex);

    await switchToSession(newSessionIndex ?? null);
  }

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="account options"
        size="medium"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        {...props}
      >
        <Avatar>
          <PersonIcon />
        </Avatar>
      </IconButton>

      <Popover
        open={menuOpen}
        anchorEl={anchorEl}
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
              p: 2,
              borderRadius: 4,
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
        {currentSession && (
          <Typography
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            {currentSession.email}
          </Typography>
        )}
        <Avatar
          sx={{
            alignSelf: 'center',
            mx: 'auto',
            mt: 3,
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
        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            fontSize: '1.3em',
            fontWeight: 'fontWeightMedium',
          }}
        >
          {currentSession ? currentSession.displayName : 'Local Account'}
        </Typography>

        <List
          disablePadding
          sx={{
            mt: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {sessions.map((session, index) => (
            <ListItem
              key={index}
              disablePadding
              onClick={() => void handleSwitchSession(index)}
            >
              <Paper
                elevation={1}
                sx={(theme) => ({
                  flexGrow: 1,
                  px: 3,
                  py: 1,
                  borderRadius: 1,
                  ...(index === 0 && {
                    borderTopLeftRadius: theme.shape.borderRadius * 4,
                    borderTopRightRadius: theme.shape.borderRadius * 4,
                  }),
                  ...(index === sessions.length - 1 && {
                    borderBottomLeftRadius: theme.shape.borderRadius * 4,
                    borderBottomRightRadius: theme.shape.borderRadius * 4,
                  }),
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    cursor: 'pointer',
                  },
                  ...(index === currentSessionIndex && {
                    backgroundColor: 'action.selected',
                  }),
                })}
              >
                <ListItemAvatar>
                  <Avatar>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText>
                  <Typography fontWeight="bold">{session.displayName}</Typography>
                  <Typography
                    sx={{
                      fontSize: '.9em',
                    }}
                  >
                    {session.email}
                  </Typography>
                </ListItemText>
              </Paper>
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            color="info"
            onClick={() => {
              void handleSignInWithGoogle();
            }}
          >
            Sign in with Google
          </Button>
          {currentSession && (
            <Button
              variant="contained"
              color="info"
              onClick={() => {
                void handleSignOut();
              }}
            >
              Sign out
            </Button>
          )}
        </Box>
      </Popover>
    </>
  );
}
