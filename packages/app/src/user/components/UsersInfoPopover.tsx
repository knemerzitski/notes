import { css, Popover, PopoverProps, styled } from '@mui/material';

import { TopCornerCloseButton } from '../../utils/components/TopCornerCloseButton';

import { UsersInfo } from './UsersInfo';

export function UsersInfoPopover({
  open,
  onClose,
  ...restProps
}: Omit<PopoverProps, 'open' | 'onClose'> & {
  open: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <RootPopoverStyled
        open={open}
        onClose={onClose}
        disableScrollLock
        {...restProps}
        slotProps={{
          ...restProps.slotProps,
          paper: {
            elevation: 10,
            // eslint-disable-next-line @typescript-eslint/no-misused-spread
            ...restProps.slotProps?.paper,
          },
        }}
      >
        <TopCornerCloseButton aria-label="close account options" onClick={onClose} />
        <UsersInfo />
      </RootPopoverStyled>
    </>
  );
}

export const RootPopoverStyled = styled(Popover)(
  ({ theme }) => css`
    .MuiPopover-paper {
      padding-top: ${theme.spacing(2.5)};
      padding-bottom: ${theme.spacing(2.5)};
      border-radius: ${theme.shape.borderRadius * 2}px;
      width: min(400px, 100vw);
    }
  `
);
