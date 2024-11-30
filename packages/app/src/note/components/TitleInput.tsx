import { css, styled } from '@mui/material';
import { PlainInput } from '../../utils/components/PlainInput';
import { forwardRef } from 'react';

export const TitleInput = forwardRef<unknown, Parameters<typeof PlainInputStyled>[0]>(
  function TitleInput({ placeholder = 'Title', ...restProps }, ref) {
    return <PlainInputStyled ref={ref} placeholder={placeholder} {...restProps} />;
  }
);

export const PlainInputStyled = styled(PlainInput)(css`
  font-weight: bold;
`);
