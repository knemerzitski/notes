import { IconButton, IconButtonProps, Menu, MenuProps } from '@mui/material';
import { useId, useState, MouseEvent, ReactNode, useCallback, ElementType } from 'react';
import { OnCloseProvider } from '../context/on-close';

export function IconButtonMenu({
  children,
  slots,
  slotProps,
}: {
  children: ReactNode;
  slots?: {
    iconButton?: ElementType;
    menu?: ElementType;
  };
  slotProps?: {
    iconButton?: Omit<
      IconButtonProps,
      | 'id'
      | 'aria-controls'
      | 'aria-haspopup'
      | 'aria-expanded'
      | 'onMouseDown'
      | 'onClick'
    >;
    menu?: Omit<
      MenuProps,
      'id' | 'anchorEl' | 'open' | 'onClose' | 'disableScrollLock' | 'onClick'
    > & {
      MenuListProps: Omit<MenuProps['MenuListProps'], 'aria-labelledby'>;
    };
  };
}) {
  const IconButtonSlot = slots?.iconButton ?? IconButton;
  const MenuSlot = slots?.menu ?? Menu;

  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = anchorEl != null;

  function handleMouseDown(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleOpen(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  function handleClickMenu(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  return (
    <>
      <IconButtonSlot
        {...slotProps?.iconButton}
        id={buttonId}
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onMouseDown={handleMouseDown}
        onClick={handleOpen}
      />

      <MenuSlot
        {...slotProps?.menu}
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        MenuListProps={{
          ...slotProps?.menu?.MenuListProps,
          'aria-labelledby': anchorEl?.id,
        }}
        disableScrollLock
        onClick={handleClickMenu}
      >
        <OnCloseProvider onClose={handleClose}>{children}</OnCloseProvider>
      </MenuSlot>
    </>
  );
}
