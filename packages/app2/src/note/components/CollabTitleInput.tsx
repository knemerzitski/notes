import { NoteTextFieldName } from '../../__generated__/graphql';
import { TitleInput } from './TitleInput';
import { CollabInput } from './CollabInput';
import { InputProps } from '@mui/material';

export function CollabTitleInput(
  props?: Parameters<typeof CollabInput<InputProps>>[0]['InputProps']
) {
  return (
    <CollabInput
      fieldName={NoteTextFieldName.TITLE}
      Input={TitleInput}
      InputProps={props}
    />
  );
}
