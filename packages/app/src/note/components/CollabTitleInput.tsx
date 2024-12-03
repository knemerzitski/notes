import { InputProps } from '@mui/material';

import { NoteTextFieldName } from '../../__generated__/graphql';

import { CollabInput } from './CollabInput';
import { TitleInput } from './TitleInput';

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
