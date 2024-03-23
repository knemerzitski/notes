import { InputProps } from '@mui/material';

import PlainInput from '../../../components/inputs/PlainInput';

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
