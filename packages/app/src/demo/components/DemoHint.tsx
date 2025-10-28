import { Button, css, Paper, Popper, styled, Typography } from '@mui/material';
import { PopperOwnProps } from '@mui/material/Popper/BasePopper.types';

export function DemoHint({
  onDismiss,
  ...restProps
}: Omit<PopperOwnProps, 'open'> & {
  onDismiss: () => void;
}) {
  // TODO add transition
  // https://mui.com/material-ui/react-popper/
  return (
    <PopperStyled open={true} {...restProps}>
      <PaperStyled>
        <Typography>
          Demo accounts available.
          <br />
          Sign in to try real-time editing.
          <br />
        </Typography>
        <ButtonStyled variant="text" color="secondary" onClick={onDismiss}>
          Got it
        </ButtonStyled>
      </PaperStyled>
    </PopperStyled>
  );
}

const PopperStyled = styled(Popper)(
  ({ theme }) => css`
    z-index: ${theme.zIndex.appBar};
  `
);

const PaperStyled = styled(Paper)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column;

    margin: ${theme.spacing(1)};
    /* tmp fix left screen overflow */
    margin-left: ${theme.spacing(7)};
    padding: ${theme.spacing(1)};
    padding-bottom: 0;
    border: 1px solid ${theme.palette.secondary.dark};
  `
);

const ButtonStyled = styled(Button)(css`
  align-self: flex-end;
`);
