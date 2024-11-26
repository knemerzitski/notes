import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { Avatar } from '@mui/material';
import { FirstLetter } from '../../utils/components/FirstLetter';
import PersonIcon from '@mui/icons-material/Person';
import { useUserId } from '../context/user-id';
import { TextBackgroundAvatar } from '../../utils/components/TextBackgroundAvatar';
import { LargeAvatar } from '../../utils/components/LargeAvatar';
import { LargePersonIcon } from '../../utils/components/LargePersionIcon';
import { LargeTextBackgroundAvatar } from '../../utils/components/LargeTextBackgroundAvatar';

const UserAvatar_Query = gql(`
  query UserAvatar_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      public {
        id
        profile {
          displayName
        }
      }
      localOnly
    }
  }
`);

export function UserAvatar({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const userId = useUserId();

  const { data } = useQuery(UserAvatar_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUser;
  if (!user) return null;

  const name = user.public.profile.displayName;

  if (user.localOnly) {
    switch (size) {
      case 'large':
        return (
          <LargeAvatar>
            <LargePersonIcon />
          </LargeAvatar>
        );
      default:
        return (
          <Avatar>
            <PersonIcon />
          </Avatar>
        );
    }
  }

  const SizeTextBackgroundAvatar =
    size == 'large' ? LargeTextBackgroundAvatar : TextBackgroundAvatar;

  return (
    <SizeTextBackgroundAvatar bgColorText={name}>
      <FirstLetter text={name} />
    </SizeTextBackgroundAvatar>
  );
}
