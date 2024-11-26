import { Box, BoxProps, css, styled } from '@mui/material';
import { CollabInputs } from './CollabInputs';

export function CollabInputsColumn({
  BoxProps,
  CollabInputsProps,
}: {
  BoxProps?: BoxProps;
  CollabInputsProps?: Parameters<typeof CollabInputs>[0];
}) {
  return (
    <CollabInputsColumnStyled {...BoxProps}>
      <CollabInputs {...CollabInputsProps} />
    </CollabInputsColumnStyled>
  );
}

const CollabInputsColumnStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    overflow: auto;
  `
);
