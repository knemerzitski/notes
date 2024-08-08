import { InputProps } from '@mui/material';

import { PlainInput } from '../../../common/components/plain-input';

export function TitleInput(props?: InputProps) {
  return (
    <PlainInput
      placeholder="Title"
      {...props}
      sx={{
        '.MuiInputBase-input': {
          fontWeight: 'bold',
        },
        ...props?.sx,
      }}
    />
  );
}
