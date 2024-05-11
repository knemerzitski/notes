import { BoxProps } from '@mui/material';

import InputsBox from '../../../components/edit/InputsBox';

import CollabContentInput from './CollabContentInput';
import CollabTitleInput from './CollabTitleInput';

export interface CollabInputsProps {
  boxProps?: BoxProps;
}

export default function CollabInputs({ boxProps }: CollabInputsProps) {
  return (
    <InputsBox {...boxProps}>
      <CollabTitleInput />
      <CollabContentInput />
    </InputsBox>
  );
}
