import { ContentInput } from './ContentInput';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { InputProps } from '@mui/material';
import { CollabInput } from './CollabInput';

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
