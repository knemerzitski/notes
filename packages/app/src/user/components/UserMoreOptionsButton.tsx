import { useQuery } from '@apollo/client';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import { Tooltip } from '@mui/material';

import { gql } from '../../__generated__';
import { IconButtonMenu } from '../../utils/components/IconButtonMenu';

import { useUserId } from '../context/user-id';

import { ForgetUserMenuItem } from './ForgetUserMenuItem';
import { SignInMenuItem } from './SignInMenuItem';
import { SignOutMenuItem } from './SignOutMenuItem';


const UserMoreOptionsButton_Query = gql(`
  query UserMoreOptionsButton_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      localOnly
    }
  }
`);

type IconButtonMenuProps = Parameters<typeof IconButtonMenu>[0];

export function UserMoreOptionsButton({
  iconButtonMenuProps,
}: {
  iconButtonMenuProps?: Pick<IconButtonMenuProps, 'slots'> & {
    slotProps?: Omit<NonNullable<IconButtonMenuProps['slotProps']>, 'iconButton'> & {
      iconButton?: Omit<
        NonNullable<NonNullable<IconButtonMenuProps['slotProps']>['iconButton']>,
        'children'
      >;
    };
  };
}) {
  const userId = useUserId();
  const { data } = useQuery(UserMoreOptionsButton_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUser;
  if (!user) return null;

  if (user.localOnly) {
    return null;
  }

  return (
    <IconButtonMenu
      aria-label="account more options"
      {...iconButtonMenuProps}
      slotProps={{
        ...iconButtonMenuProps?.slotProps,
        iconButton: {
          ...iconButtonMenuProps?.slotProps?.iconButton,
          children: (
            <Tooltip title="More options">
              <MoreHorizIcon />
            </Tooltip>
          ),
        },
      }}
    >
      <SignInMenuItem />
      <SignOutMenuItem />
      <ForgetUserMenuItem />
    </IconButtonMenu>
  );
}
