import { Box, BoxProps, css, styled } from '@mui/material';

import { CollabInputs } from './CollabInputs';
import { forwardRef } from 'react';

export const CollabInputsColumn = forwardRef<
  HTMLDivElement,
  BoxProps & {
  CollabInputsProps?: Parameters<typeof CollabInputs>[0];
  }
>(function CollabInputsColumn({ CollabInputsProps, ...restProps }, ref) {
  return (
    <BoxStyled {...restProps} ref={ref}>
      <CollabInputs {...CollabInputsProps} />
    </BoxStyled>
  );
});

const BoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    overflow: auto;
  `
);
