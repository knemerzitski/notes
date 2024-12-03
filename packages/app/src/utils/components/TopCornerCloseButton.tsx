import CloseIcon from '@mui/icons-material/Close';
import { Tooltip, IconButton, css, IconButtonProps, styled } from '@mui/material';

export function TopCornerCloseButton(props?: Omit<IconButtonProps, 'children'>) {
  return (
    <RootIconButtonStyled {...props}>
      <Tooltip title="Close">
        <CloseIcon />
      </Tooltip>
    </RootIconButtonStyled>
  );
}

export const RootIconButtonStyled = styled(IconButton)(({ theme }) => {
  return css`
    position: absolute;
    right: ${theme.spacing(1)};
    top: ${theme.spacing(1)};
  `;
});
