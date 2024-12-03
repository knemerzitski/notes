import { InputProps } from '@mui/material';

import { NoteTextFieldName } from '../../__generated__/graphql';

import { CollabInput } from './CollabInput';
import { ContentInput } from './ContentInput';

export function CollabContentInput(
  props?: Parameters<typeof CollabInput<InputProps>>[0]['InputProps']
) {
  return (
    <CollabInput
      fieldName={NoteTextFieldName.CONTENT}
      Input={ContentInput}
      InputProps={props}
    />
  );
}
