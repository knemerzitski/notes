import { InputProps } from '@mui/material';

import PlainInput from '../../common/components/PlainInput';

export default function ContentInput(props?: InputProps) {
  return (
    <PlainInput
      placeholder="Note"
      multiline
      {...props}
      sx={{
        flexGrow: 1,
        ...props?.sx,
      }}
    />
  );
}
