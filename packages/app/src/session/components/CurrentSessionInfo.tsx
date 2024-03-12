import { useSuspenseQuery } from '@apollo/client';
import PersonIcon from '@mui/icons-material/Person';
import { Box, Avatar, Typography } from '@mui/material';

import { gql } from '../../__generated__/gql';
import BackgroundLetterAvatar from '../../components/data/BackgroundLetterAvatar';

const QUERY = gql(`
  query CurrentSessionInfo {
    currentClientSession @client {
      id
      displayName
      email
    }
  }
`);

export default function CurrentSessionInfo() {
  const {
    data: { currentClientSession },
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
      {currentClientSession ? (
        <BackgroundLetterAvatar
          name={currentClientSession.displayName}
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
          {currentClientSession ? currentClientSession.displayName : 'Local Account'}
        </Typography>
        {currentClientSession && (
          <Typography
            sx={{
              fontSize: '0.9em',
            }}
          >
            {currentClientSession.email}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
