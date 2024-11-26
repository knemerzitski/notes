import { css, Input, InputProps, styled } from '@mui/material';

export function PlainInput(props: InputProps) {
  const handleParentClick: InputProps['onClick'] = (e) => {
    // If clicked parent while child is textarea then set selection to end
    if (e.target instanceof Node && e.target.firstChild instanceof HTMLTextAreaElement) {
      e.target.firstChild.selectionStart = -1;
    }

    props.onClick?.(e);
  };

  const handleInputClick: NonNullable<
    NonNullable<InputProps['slotProps']>['input']
  >['onClick'] = (e) => {
    e.stopPropagation();

    props.slotProps?.input?.onClick?.(e);
  };

  return (
    <PlainInputStyled
      {...props}
      onClick={handleParentClick}
      slotProps={{
        ...props.slotProps,
        input: {
          ...props.slotProps?.input,
          onClick: handleInputClick,
        },
      }}
    />
  );
}

const PlainInputStyled = styled(Input)(css`
  padding: 0;

  .MuiInputBase-input {
    padding: 0;
  }
`);

PlainInputStyled.defaultProps = {
  disableUnderline: true,
  fullWidth: true,
};
