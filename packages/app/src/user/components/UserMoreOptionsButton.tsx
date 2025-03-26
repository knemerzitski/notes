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
  query UserMoreOptionsButton_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
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
    fetchPolicy: 'cache-only',
  });

  const user = data?.signedInUser;
  if (!user) return null;

  if (user.localOnly) {
    return null;
  }

  return (
    <IconButtonMenu
      {...iconButtonMenuProps}
      slotProps={{
        ...iconButtonMenuProps?.slotProps,
        iconButton: {
          'aria-label': 'more options',
          ...iconButtonMenuProps?.slotProps?.iconButton,
          children: (
            <Tooltip title="More options">
              <MoreHorizIcon />
            </Tooltip>
          ),
        },
        menu: {
          ...iconButtonMenuProps?.slotProps?.menu,
          slotProps: {
            ...iconButtonMenuProps?.slotProps?.menu?.slotProps,
            paper: {
              'aria-label': 'user more options menu',
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...iconButtonMenuProps?.slotProps?.menu?.slotProps?.paper,
            },
          },
        },
      }}
    >
      <SignInMenuItem />
      <SignOutMenuItem />
      <ForgetUserMenuItem />
    </IconButtonMenu>
  );
}
