import { Input, InputProps } from '@mui/material';

/**
 * Styled input without any border or underline.
 */
export default function PlainInput(props: InputProps) {
  return (
    <Input
      {...props}
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
