import { useSuspenseQuery } from '@apollo/client';
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
} from '@mui/material';
import { useId, useState } from 'react';

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { useSwitchToSessionIndex } from '../session/SessionSwitcherProvider';
import GET_SESSIONS from '../session/graphql/GET_SESSIONS';

export default function UserButton(props: IconButtonProps) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    data: { sessions, activeSessionIndex },
  } = useSuspenseQuery(GET_SESSIONS);
  const activeSession = sessions[activeSessionIndex];

  const switchToSession = useSwitchToSessionIndex();
  const showError = useSnackbarError();

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
              key={`${session.__typename}:${session.id}`}
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
      </Popover>
    </>
  );
}
