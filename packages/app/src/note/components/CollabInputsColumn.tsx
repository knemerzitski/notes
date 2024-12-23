import { Box, BoxProps, css, styled } from '@mui/material';

import { forwardRef } from 'react';

import { CollabInputs } from './CollabInputs';

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
    gap: ${theme.spacing(1)};
    padding-top: ${theme.spacing(2)};
    padding-left: ${theme.spacing(2)};
    padding-right: ${theme.spacing(2)};
    overflow: auto;
    scroll-padding-bottom: 2px;
  `
);
