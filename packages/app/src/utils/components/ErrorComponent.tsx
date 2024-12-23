import { css, Divider, Paper, styled, Typography } from '@mui/material';

export function ErrorComponent({ error }: { error: Error }) {
  const message = error.message;

  const stack = import.meta.env.DEV ? error.stack : null;

  return (
    <RootPaperStyled variant="elevation" elevation={1}>
      <Title>Sorry, an unexpected error has occurred.</Title>

      <Divider />

      <Message>{message}</Message>

      {stack && <Stack>{stack}</Stack>}
    </RootPaperStyled>
  );
}

const RootPaperStyled = styled(Paper)(
  ({ theme }) => css`
    padding: ${theme.spacing(2)};
    border-radius: ${theme.shape.borderRadius * 2}px;
    border: 1px solid ${theme.palette.error.dark};
  `
);

const Title = styled(Typography)(
  ({ theme }) => css`
    font-size: 1.2em;
    letter-spacing: 0.8px;
    color: ${theme.palette.error.dark};
  `
);

const Message = styled(Typography)(
  ({ theme }) => css`
    margin-top: ${theme.spacing(2)};
    font-weight: ${theme.typography.fontWeightBold};
    white-space: pre-wrap;
  `
);

const Stack = styled(Typography)(
  ({ theme }) => css`
    margin-top: ${theme.spacing(1)};
    white-space: pre-wrap;
  `
);
