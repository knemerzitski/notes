import {
  Button,
  css,
  Fade,
  Paper,
  Popper,
  styled,
  Typography,
  useTheme,
} from '@mui/material';
import { PopperOwnProps } from '@mui/material/Popper/BasePopper.types';

export function DemoHint({
  onDismiss,
  ...restProps
}: Omit<PopperOwnProps, 'transition'> & {
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <PopperStyled {...restProps} transition={true}>
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={theme.transitions.duration.short}>
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
        </Fade>
      )}
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
