import {
  css,
  Dialog,
  IconButton,
  IconButtonProps,
  Menu,
  MenuList,
  MenuProps,
  Slide,
  styled,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
  useId,
  useState,
  MouseEvent,
  ReactNode,
  useCallback,
  ElementType,
  useRef,
  forwardRef,
  ReactElement,
} from 'react';

import { useIsMobile } from '../../theme/context/is-mobile';
import { OnCloseProvider } from '../context/on-close';

export function IconButtonMenu({
  children,
  slots,
  slotProps,
  onOpen,
  onClose,
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
      MenuListProps?: Omit<MenuProps['MenuListProps'], 'aria-labelledby'>;
    };
  };
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const IconButtonSlot = slots?.iconButton ?? IconButton;
  const MenuSlot = slots?.menu ?? Menu;

  const isMobile = useIsMobile();

  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = anchorEl != null;

  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function handleMouseDown(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleOpen(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    onOpenRef.current?.();
  }

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    onCloseRef.current?.();
  }, []);

  function handleClickMenu(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleClickMenuDialog(e: MouseEvent<HTMLDivElement>): void {
    handleClickMenu(e);
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

      {isMobile ? (
        <MenuDialogStyled
          id={menuId}
          open={menuOpen}
          onClose={handleClose}
          TransitionComponent={SlideUpTransition}
          disableScrollLock
          onClick={handleClickMenuDialog}
        >
          <MenuList {...slotProps?.menu?.MenuListProps} aria-labelledby={anchorEl?.id}>
            {children}
          </MenuList>
        </MenuDialogStyled>
      ) : (
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
      )}
    </>
  );
}

const MenuDialogStyled = styled(Dialog)(css`
  & .MuiPaper-root {
    position: absolute;
    width: 100%;
    max-width: 100%;
    bottom: 0;
    margin: 0;
    border-radius: 0;
  }
`);

const SlideUpTransition = forwardRef<
  unknown,
  TransitionProps & { children: ReactElement }
>(function SlideUpTransition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
