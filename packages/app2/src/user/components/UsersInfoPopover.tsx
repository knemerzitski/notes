import CloseIcon from '@mui/icons-material/Close';
import { PopoverProps, Tooltip } from '@mui/material';
import { UsersInfo } from './UsersInfo';
import { AbsoluteCornerIconButton } from '../../utils/styled-components/AbsoluteCornerIconButton';
import { ContainedBigRoundedPopover } from '../../utils/styled-components/ContainedBigRoundedPopover';

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
      <ContainedBigRoundedPopover
        open={open}
        onClose={onClose}
        disableScrollLock
        {...restProps}
        slotProps={{
          ...restProps.slotProps,
          paper: {
            elevation: 10,
            ...restProps.slotProps?.paper,
          },
        }}
      >
        <AbsoluteCornerIconButton
          aria-label="close account options"
          onClick={onClose}
        >
          <Tooltip title="Close">
            <CloseIcon />
          </Tooltip>
        </AbsoluteCornerIconButton>
        <UsersInfo />
      </ContainedBigRoundedPopover>
    </>
  );
}
