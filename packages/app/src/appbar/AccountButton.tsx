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
import { AuthProvider } from '../graphql/__generated__/graphql';
import { useSwitchToSessionIndex } from '../graphql/session/context/SessionSwitcherProvider';
import CREATE_SESSION from '../graphql/session/operations/CREATE_SESSION';
import DELETE_SESSION from '../graphql/session/operations/DELETE_SESSION';
import GET_SESSIONS from '../graphql/session/operations/GET_SESSIONS';
import SIGN_IN from '../graphql/session/operations/SIGN_IN';
import SIGN_OUT from '../graphql/session/operations/SIGN_OUT';

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
    const signInResult = await signIn({
      variables: {
        input: {
          provider: AuthProvider.Google,
          credentials: {
            token: 'test-google-account',
          },
        },
      },
    });

    if (!signInResult.data?.signIn) return;

    const {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      sessionIndex,
      userInfo: {
        profile: { displayName },
      },
    } = signInResult.data.signIn;

    const createSessionResult = await createSession({
      variables: {
        input: {
          index: sessionIndex,
          profile: {
            displayName,
            email: 'testaccount@gmail.com',
          },
        },
      },
      refetchQueries: [GET_SESSIONS],
    });

    const index = createSessionResult.data?.createRemoteSession;
    if (index && index >= 0) {
      await switchToSession(index);
    }
  }

  async function handleSignOut() {
    if (currentSession.__typename === 'LocalSession') return;

    const result = await signOut();

    if (!result.data) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { signedOut, activeSessionIndex: newSessionIndex } = result.data.signOut;

    if (!signedOut) return;

    await deleteSession({
      variables: {
        index: activeSessionIndex,
      },
      refetchQueries: [GET_SESSIONS],
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await switchToSession(newSessionIndex ?? 0);
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
