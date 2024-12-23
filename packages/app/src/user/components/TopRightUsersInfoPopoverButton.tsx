import { UsersInfoPopoverButton } from './UsersInfoPopoverButton';

export function TopRightUsersInfoPopoverButton() {
  return (
    <UsersInfoPopoverButton
      ButtonProps={{
        edge: 'end',
      }}
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
      }}
    />
  );
}
