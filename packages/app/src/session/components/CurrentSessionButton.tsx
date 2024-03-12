import { useSuspenseQuery } from '@apollo/client';
import PersonIcon from '@mui/icons-material/Person';
import { IconButtonProps, IconButton, Badge, Avatar } from '@mui/material';

import { gql } from '../../__generated__/gql';
import BackgroundLetterAvatar from '../../components/data/BackgroundLetterAvatar';

const QUERY = gql(`
  query CurrentSessionButton {
    currentSavedSession @client {
      displayName
      isExpired
    }
  }
`);

export default function CurrentSessionButton(props?: IconButtonProps) {
  const {
    data: { currentSavedSession },
  } = useSuspenseQuery(QUERY);

  return (
    <IconButton color="inherit" {...props}>
      {currentSavedSession?.isExpired ? (
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
          <BackgroundLetterAvatar name={currentSavedSession.displayName} />
        </Badge>
      ) : currentSavedSession ? (
        <BackgroundLetterAvatar name={currentSavedSession.displayName} />
      ) : (
        <Avatar>
          <PersonIcon />
        </Avatar>
      )}
    </IconButton>
  );
}
