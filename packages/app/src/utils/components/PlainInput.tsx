import { css, Input, InputProps, styled } from '@mui/material';
import { forwardRef } from 'react';

export const PlainInput = forwardRef<unknown, Parameters<typeof InputStyled>[0]>(
  function PlainInput({ disableUnderline = true, fullWidth = true, ...restProps }, ref) {
    const handleClick: InputProps['onClick'] = (e) => {
      // If clicked parent while child is textarea then set selection to end
      if (
        e.target instanceof Node &&
        e.target.firstChild instanceof HTMLTextAreaElement
      ) {
        e.target.firstChild.selectionStart = -1;
      }

      restProps.onClick?.(e);
    };

    const handleInputClick: NonNullable<
      NonNullable<InputProps['slotProps']>['input']
    >['onClick'] = (e) => {
      e.stopPropagation();

      restProps.slotProps?.input?.onClick?.(e);
    };

    return (
      <InputStyled
        ref={ref}
        disableUnderline={disableUnderline}
        fullWidth={fullWidth}
        {...restProps}
        onClick={handleClick}
        slotProps={{
          ...restProps.slotProps,
          input: {
            ...restProps.slotProps?.input,
            onClick: handleInputClick,
          },
        }}
      />
    );
  }
);

const InputStyled = styled(Input)(css`
  padding: 0;

  .MuiInputBase-input {
    padding: 0;
  }
`);
