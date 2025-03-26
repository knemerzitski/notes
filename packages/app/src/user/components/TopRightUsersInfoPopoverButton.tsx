import { forwardRef } from 'react';

import { gql } from '../../__generated__';

import { UsersInfoPopoverButton } from './UsersInfoPopoverButton';

const _TopRightUsersInfoPopoverButton_UserFragment = gql(`
  fragment TopRightUsersInfoPopoverButton_UserFragment on User {
    ...UsersInfoPopoverButton_UserFragment
  }
`);

export const TopRightUsersInfoPopoverButton = forwardRef<
  HTMLButtonElement,
  Parameters<typeof UsersInfoPopoverButton>[0]
>(function TopRightUsersInfoPopoverButton(props, ref) {
  return (
    <UsersInfoPopoverButton
      ref={ref}
      edge="end"
      {...props}
      PopoverProps={{
        keepMounted: true,
        transformOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
        ...props.PopoverProps,
      }}
    />
  );
});
