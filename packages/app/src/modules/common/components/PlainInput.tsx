import { Input, InputProps } from '@mui/material';

/**
 * Styled input without any border or underline.
 */
export default function PlainInput(props: InputProps) {
  return (
    <Input
      disableUnderline
      fullWidth
      {...props}
      slotProps={{
        ...props.slotProps,
        input: {
          ...props.slotProps?.input,
          onClick: (e) => {
            props.slotProps?.input?.onClick?.(e);
            e.stopPropagation();
          },
        },
      }}
      onClick={(e) => {
        props.onClick?.(e);
        // If clicked on div outside textarea, set selection to the end
        const child = (e.target as { firstChild?: unknown }).firstChild;
        if (child instanceof HTMLTextAreaElement) {
          child.selectionStart = -1;
        }
      }}
      sx={{
        borderRadius: 0,
        '.MuiInputBase-root': {
          alignItems: 'flex-start',
          flexGrow: 1,
        },
        '.MuiInputBase-input, .MuiInputBase-multiline': {
          padding: 0,
        },
        ...props.sx,
      }}
    />
  );
}
