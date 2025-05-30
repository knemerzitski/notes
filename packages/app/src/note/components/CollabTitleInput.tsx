import { InputProps } from '@mui/material';

import { gql } from '../../__generated__';

import { NoteTextFieldName } from '../types';

import { CollabInput, CollabInputProps } from './CollabInput';
import { TitleInput } from './TitleInput';

const _CollabTitleInput_NoteFragment = gql(`
  fragment CollabTitleInput_NoteFragment on Note {
    ...CollabInput_NoteFragment
  }
`);

export function CollabTitleInput(
  props?: Pick<CollabInputProps<InputProps>, 'slotProps'> & {
    slots?: Omit<CollabInputProps<InputProps>['slots'], 'input'>;
  }
) {
  return (
    <CollabInput
      fieldName={NoteTextFieldName.TITLE}
      {...props}
      slots={{
        ...props?.slots,
        input: TitleInput,
      }}
      slotProps={{
        ...props?.slotProps,
        root: {
          'aria-label': 'title',
          ...props?.slotProps?.root,
        },
      }}
    />
  );
}
