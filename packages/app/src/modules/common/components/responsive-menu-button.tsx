import {
  Dialog,
  IconButton,
  IconButtonProps,
  Menu,
  MenuItem,
  MenuItemProps,
  MenuList,
  Slide,
  Tooltip,
  TooltipProps,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useId, useState, MouseEvent, ReactElement, Ref, forwardRef } from 'react';

import { useIsMobile } from '../hooks/use-is-mobile';

export interface ResponsiveMenuButtonProps {
  tooltipProps: Omit<TooltipProps, 'children'>;
  iconButtonProps?: IconButtonProps;
  itemsProps: MenuItemProps[];
  onOpened?: () => void;
  onClosed?: () => void;
}

export function ResponsiveMenuButton({
  tooltipProps,
  iconButtonProps,
  itemsProps,
  onOpened,
  onClosed,
}: ResponsiveMenuButtonProps) {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isMobile = useIsMobile();

  if (itemsProps.length === 0) return null;

  const isMenuOpen = anchorEl != null;

  function handleClickOpen(e: MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
    onOpened?.();
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleClosed() {
    onClosed?.();
  }

  const menuItemsEl = itemsProps.map((itemProps, index) => (
    <MenuItem
      key={index}
      {...itemProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!isMenuOpen) return;

        itemProps.onClick?.(e);

        handleClose();
        handleClosed();
      }}
    />
  ));

  return (
    <>
      <Tooltip {...tooltipProps}>
        <span>
          <IconButton
            id={buttonId}
            color="inherit"
            size="medium"
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-haspopup={true}
            aria-expanded={isMenuOpen ? true : undefined}
            onClick={handleClickOpen}
            {...iconButtonProps}
          />
        </span>
      </Tooltip>

      {isMobile ? (
        <Dialog
          id={menuId}
          open={isMenuOpen}
          onClose={handleClose}
          onTransitionExited={handleClosed}
          TransitionComponent={SlideUpTransition}
          PaperProps={{
            sx: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              m: 0,
              borderRadius: 0,
            },
          }}
        >
          <MenuList aria-labelledby={anchorEl?.id}>{menuItemsEl}</MenuList>
        </Dialog>
      ) : (
        <Menu
          id={menuId}
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleClose}
          onTransitionExited={handleClosed}
          MenuListProps={{
            'aria-labelledby': anchorEl?.id,
          }}
          transitionDuration={{
            appear: 200,
            enter: 200,
            exit: 0,
          }}
          disableScrollLock
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {menuItemsEl}
        </Menu>
      )}
    </>
  );
}

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});
