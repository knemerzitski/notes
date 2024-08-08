import { BoxProps } from '@mui/material';

import { CollabContentInputProps, CollabContentInput } from './collab-content-input';
import { CollabTitleInputProps, CollabTitleInput } from './collab-title-input';
import { InputsBox } from './inputs-box';

export interface CollabInputsProps {
  boxProps?: BoxProps;
  titleProps?: CollabTitleInputProps;
  contentProps?: CollabContentInputProps;
}

export function CollabInputs({ boxProps, titleProps, contentProps }: CollabInputsProps) {
  return (
    <InputsBox {...boxProps}>
      <CollabTitleInput {...titleProps} />
      <CollabContentInput {...contentProps} />
    </InputsBox>
  );
}
