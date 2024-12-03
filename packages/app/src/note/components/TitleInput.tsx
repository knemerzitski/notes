import { css, styled } from '@mui/material';

import { forwardRef } from 'react';

import { PlainInput } from '../../utils/components/PlainInput';

export const TitleInput = forwardRef<unknown, Parameters<typeof PlainInputStyled>[0]>(
  function TitleInput({ placeholder = 'Title', ...restProps }, ref) {
    return <PlainInputStyled ref={ref} placeholder={placeholder} {...restProps} />;
  }
);

export const PlainInputStyled = styled(PlainInput)(css`
  font-weight: bold;
`);
