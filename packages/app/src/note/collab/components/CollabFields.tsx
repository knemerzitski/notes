import { BoxProps } from '@mui/material';

import InputsBox from '../../components/edit/InputsBox';

import CollabContentInput from './CollabContentInput';
import CollabTitleInput from './CollabTitleInput';

export interface CollabFieldsProps {
  boxProps?: BoxProps;
}

export default function CollabFields({ boxProps }: CollabFieldsProps) {
  return (
    <InputsBox {...boxProps}>
      <CollabTitleInput />
      <CollabContentInput />
    </InputsBox>
  );
}
