import { useSuspenseQuery } from '@apollo/client';
import PersonIcon from '@mui/icons-material/Person';
import { Box, Avatar, Typography } from '@mui/material';

import { gql } from '../../__generated__/gql';
import BackgroundLetterAvatar from '../../components/data/BackgroundLetterAvatar';

const QUERY = gql(`
  query CurrentSessionInfo {
    currentSavedSession @client {
      displayName
      email
    }
  }
`);

export default function CurrentSessionInfo() {
  const {
    data: { currentSavedSession },
  } = useSuspenseQuery(QUERY);

  return (
    <Box
      sx={{
        display: 'flex',
        pl: 2,
        my: 1,
        gap: 2,
        alignItems: 'center',
      }}
    >
      {currentSavedSession ? (
        <BackgroundLetterAvatar
          name={currentSavedSession.displayName}
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
            fontSize: '1em',
            fontWeight: 'bold',
          }}
        >
          {currentSavedSession ? currentSavedSession.displayName : 'Local Account'}
        </Typography>
        {currentSavedSession && (
          <Typography
            sx={{
              fontSize: '0.9em',
            }}
          >
            {currentSavedSession.email}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
