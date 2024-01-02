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

import { useSnackbarError } from '../feedback/SnackbarAlertProvider';
import { AuthProvider } from '../apollo/__generated__/graphql';
import { useSwitchToSessionIndex } from '../apollo/session/context/SessionSwitcherProvider';
import CREATE_SESSION from '../apollo/session/operations/CREATE_SESSION';
import DELETE_SESSION from '../apollo/session/operations/DELETE_SESSION';
import GET_SESSIONS from '../apollo/session/operations/GET_SESSIONS';
import SIGN_IN from '../apollo/session/operations/SIGN_IN';
import SIGN_OUT from '../apollo/session/operations/SIGN_OUT';

export default function AccountButton(props: IconButtonProps) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    data: { savedSessions: sessions, currentSavedSession: currentSession },
  } = useSuspenseQuery(GET_SESSIONS);

  const switchToSession = useSwitchToSessionIndex();
  const showError = useSnackbarError();

  const [signIn] = useMutation(SIGN_IN);
  const [signOut] = useMutation(SIGN_OUT);
  const [createSession] = useMutation(CREATE_SESSION);
  const [deleteSession] = useMutation(DELETE_SESSION);

  const menuOpen = Boolean(anchorEl);

  async function handleSwitchSession(index: number) {
    if (index !== currentSession?.index) {
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
            token:
              'test-google-account' +
              (currentSession?.index ? currentSession.index + 1 : 1),
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

    const createSessionPayload = await createSession({
      variables: {
        input: {
          index: sessionIndex,
          profile: {
            displayName,
            email: 'testaccount@gmail.com', // TODO email from google auth jwt response
          },
        },
      },
      refetchQueries: [GET_SESSIONS],
    });

    if (!createSessionPayload.data?.createSavedSession) {
      console.log(createSessionPayload);
      if (createSessionPayload.errors) {
        showError(createSessionPayload.errors.map((err) => err.message).join(';'));
      } else {
        showError('Failed to save session');
      }
      return;
    }

    await switchToSession(sessionIndex);
  }

  async function handleSignOut() {
    if (!currentSession) return;

    const signOutPayload = await signOut();
    if (!signOutPayload.data) return;

    const { signedOut, activeSessionIndex: newSessionIndex } =
      signOutPayload.data.signOut;

    if (!signedOut) return;

    await deleteSession({
      variables: {
        input: {
          index: currentSession.index,
        },
      },
      refetchQueries: [GET_SESSIONS],
    });

    await switchToSession(newSessionIndex ?? NaN);
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
          <>
            <Typography
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {currentSession.profile.email}
            </Typography>
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
              {currentSession.profile.displayName}
            </Typography>
          </>
        )}

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
                  ...(index === currentSession?.index && {
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
                  <Typography fontWeight="bold">{session.profile.displayName}</Typography>
                  <Typography
                    sx={{
                      fontSize: '.9em',
                    }}
                  >
                    {session.profile.email}
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
