import { BoxProps } from '@mui/material';

import InputsBox from './InputsBox';

import CollabContentInput, { CollabContentInputProps } from './CollabContentInput';
import CollabTitleInput, { CollabTitleInputProps } from './CollabTitleInput';

export interface CollabInputsProps {
  boxProps?: BoxProps;
  titleProps?: CollabTitleInputProps;
  contentProps?: CollabContentInputProps;
}

export default function CollabInputs({
  boxProps,
  titleProps,
  contentProps,
}: CollabInputsProps) {
  return (
    <InputsBox {...boxProps}>
      <CollabTitleInput {...titleProps} />
      <CollabContentInput {...contentProps} />
    </InputsBox>
  );
}
