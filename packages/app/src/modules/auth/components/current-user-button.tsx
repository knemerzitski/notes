import { useSuspenseQuery } from '@apollo/client';
import PersonIcon from '@mui/icons-material/Person';
import { IconButtonProps, IconButton, Badge, Avatar, Tooltip } from '@mui/material';

import { gql } from '../../../__generated__/gql';
import { BackgroundLetterAvatar } from '../../common/components/background-letter-avatar';

const QUERY = gql(`
  query CurrentUserButton {
    currentSignedInUser @client {
      id
      profile {
        displayName
      }
      isSessionExpired
    }
  }
`);

export function CurrentUserButton(props?: IconButtonProps) {
  const {
    data: { currentSignedInUser },
  } = useSuspenseQuery(QUERY);

  return (
    <Tooltip title="Accounts">
      <span>
        <IconButton color="inherit" {...props}>
          {currentSignedInUser?.isSessionExpired ? (
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
              <BackgroundLetterAvatar name={currentSignedInUser.profile.displayName} />
            </Badge>
          ) : currentSignedInUser ? (
            <BackgroundLetterAvatar name={currentSignedInUser.profile.displayName} />
          ) : (
            <Avatar>
              <PersonIcon />
            </Avatar>
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
