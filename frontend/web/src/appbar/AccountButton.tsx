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

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { AuthProvider } from '../schema/__generated__/graphql';
import { useSwitchToSessionIndex } from '../schema/session/components/SessionSwitcherProvider';
import CREATE_LOCAL_SESSION from '../schema/session/documents/CREATE_LOCAL_SESSION';
import CREATE_REMOTE_SESSION from '../schema/session/documents/CREATE_REMOTE_SESSION';
import DELETE_CLIENT_SESSION from '../schema/session/documents/DELETE_CLIENT_SESSION';
import GET_SESSIONS from '../schema/session/documents/GET_SESSIONS';
import SIGN_IN from '../schema/session/documents/SIGN_IN';
import SIGN_OUT from '../schema/session/documents/SIGN_OUT';

export default function UserButton(props: IconButtonProps) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    data: { clientSessions: sessions, activeClientSessionIndex: activeSessionIndex },
  } = useSuspenseQuery(GET_SESSIONS);
  const activeSession = sessions[activeSessionIndex];

  const switchToSession = useSwitchToSessionIndex();
  const showError = useSnackbarError();

  const [signIn] = useMutation(SIGN_IN);
  const [signOut] = useMutation(SIGN_OUT);
  const [createLocalSession] = useMutation(CREATE_LOCAL_SESSION);
  const [createRemoteSession] = useMutation(CREATE_REMOTE_SESSION);
  const [deleteClientSession] = useMutation(DELETE_CLIENT_SESSION);

  const menuOpen = Boolean(anchorEl);

  async function handleClickUser(index: number) {
    if (index !== activeSessionIndex) {
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
          token: 'test-google-account',
        },
      },
    });

    if (!signInResult.data || signInResult.data.signIn < 0) return;

    const createSessionResult = await createRemoteSession({
      variables: {
        input: {
          displayName: 'Test Google Account',
          email: 'testaccount@gmail.com',
          cookieIndex: signInResult.data.signIn,
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
    if (activeSession.__typename === 'LocalSession') return;

    const result = await signOut();

    if (!result.data || result.data.signOut < 0) return;

    await deleteClientSession({
      variables: {
        index: activeSessionIndex,
      },
      refetchQueries: [GET_SESSIONS],
    });

    await switchToSession(0);
  }

  async function handleCreateNewLocalAccount() {
    const displayName = 'LocalSession';
    const createSessionResult = await createLocalSession({
      variables: {
        displayName,
      },
      refetchQueries: [GET_SESSIONS],
    });

    const index = createSessionResult.data?.createLocalSession;
    if (index && index >= 0) {
      await switchToSession(index);
    }
  }

  async function handleDeleteLocalAccount() {
    if (activeSession.__typename === 'RemoteSession' || sessions.length <= 1) return;

    await deleteClientSession({
      variables: {
        index: activeSessionIndex,
      },
      refetchQueries: [GET_SESSIONS],
    });

    await switchToSession(0);
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
        <Typography
          sx={{
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          {activeSession.__typename === 'RemoteSession'
            ? activeSession.email
            : activeSession.displayName}
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
          Hi, {activeSession.displayName}
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
              onClick={() => void handleClickUser(index)}
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
                  ...(index === activeSessionIndex && {
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
                  {session.__typename === 'RemoteSession' && (
                    <Typography
                      sx={{
                        fontSize: '.9em',
                      }}
                    >
                      {session.email}
                    </Typography>
                  )}
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
          <Button
            variant="contained"
            color="info"
            onClick={() => {
              void handleSignOut();
            }}
          >
            Sign out
          </Button>
          <Button
            variant="contained"
            color="info"
            onClick={() => {
              void handleCreateNewLocalAccount();
            }}
          >
            New local account
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void handleDeleteLocalAccount();
            }}
          >
            Delete local account
          </Button>
        </Box>
      </Popover>
    </>
  );
}
