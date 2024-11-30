import { css, styled } from '@mui/material';
import { PlainInput } from '../../utils/components/PlainInput';
import { forwardRef } from 'react';

export const ContentInput = forwardRef<unknown, Parameters<typeof PlainInputStyled>[0]>(
  function ContentInput({ placeholder = 'Note', multiline = true, ...restProps }, ref) {
    return (
      <PlainInputStyled
        ref={ref}
        placeholder={placeholder}
        multiline={multiline}
        {...restProps}
      />
    );
  }
);

const PlainInputStyled = styled(PlainInput)(css`
  align-items: flex-start;
  flex-grow: 1;
`);
