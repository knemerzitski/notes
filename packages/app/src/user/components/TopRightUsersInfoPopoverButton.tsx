import { forwardRef } from 'react';

import { UsersInfoPopoverButton } from './UsersInfoPopoverButton';

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
