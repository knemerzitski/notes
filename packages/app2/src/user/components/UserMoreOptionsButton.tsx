import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { IconButtonMenu } from '../../utils/components/IconButtonMenu';
import { ForgetUserMenuItem } from './ForgetUserMenuItem';
import { SignInMenuItem } from './SignInMenuItem';
import { SignOutMenuItem } from './SignOutMenuItem';
import { useUserId } from '../context/user-id';
import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { Tooltip } from '@mui/material';

const UserMoreOptionsButton_Query = gql(`
  query UserMoreOptionsButton_Query($id: ID!) {
    signedInUserById(id: $id) @client {
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

  const user = data?.signedInUserById;
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
