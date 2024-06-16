import { useSuspenseQuery } from '@apollo/client';
import PersonIcon from '@mui/icons-material/Person';
import { Box, Avatar, Typography } from '@mui/material';

import { gql } from '../../../__generated__/gql';
import BackgroundLetterAvatar from '../../common/components/BackgroundLetterAvatar';

const QUERY = gql(`
  query CurrentUserInfo {
    currentSignedInUser @client {
      id
      profile {
        displayName
      }
      email
    }
  }
`);

export default function CurrentUserInfo() {
  const {
    data: { currentSignedInUser },
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
      {currentSignedInUser ? (
        <BackgroundLetterAvatar
          name={currentSignedInUser.profile.displayName}
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
          {currentSignedInUser
            ? currentSignedInUser.profile.displayName
            : 'Local Account'}
        </Typography>
        {currentSignedInUser && (
          <Typography
            sx={{
              fontSize: '0.9em',
            }}
          >
            {currentSignedInUser.email}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
