import { TextField, TextFieldProps } from '@mui/material';
import { useEffect, useRef } from 'react';

export type BorderlessTextFieldProps = {
  /**
   * Place cursor at specific point or select text
   */
  autoSelection?: 'start' | 'end' | 'all' | 'auto';
} & TextFieldProps;

/**
 * @param props
 * @returns TextField without border or padding
 */
export default function BorderlessTextField({
  autoSelection = 'auto',
  ...restProps
}: BorderlessTextFieldProps) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (autoSelection === 'end') {
      el.selectionStart = el.selectionEnd = Number.MAX_SAFE_INTEGER;
    } else if (autoSelection === 'all') {
      el.selectionStart = 0;
      el.selectionEnd = Number.MAX_SAFE_INTEGER;
    }
  }, [autoSelection]);

  return (
    <TextField
      inputRef={ref}
      {...restProps}
      sx={{
        borderRadius: 0,
        '.MuiInputBase-root': {
          alignItems: 'flex-start',
          flexGrow: 1,
        },
        '.MuiInputBase-input, .MuiInputBase-multiline': {
          padding: 0,
        },
        '.Mui-focused fieldset.MuiOutlinedInput-notchedOutline, fieldset.MuiOutlinedInput-notchedOutline':
          {
            borderWidth: 0,
          },
        ...restProps.sx,
      }}
    />
  );
}
