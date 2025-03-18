import { InputProps } from '@mui/material';

import { NoteTextFieldName } from '../../__generated__/graphql';

import { CollabInput, CollabInputProps } from './CollabInput';
import { ContentInput } from './ContentInput';
import { gql } from '../../__generated__';

const _CollabContentInput_NoteFragment = gql(`
  fragment CollabContentInput_NoteFragment on Note {
    ...CollabInput_NoteFragment
  }
`);

export function CollabContentInput(
  props?: Pick<CollabInputProps<InputProps>, 'slotProps'> & {
    slots?: Omit<CollabInputProps<InputProps>['slots'], 'input'>;
  }
) {
  return (
    <CollabInput
      fieldName={NoteTextFieldName.CONTENT}
      {...props}
      slots={{
        ...props?.slots,
        input: ContentInput,
      }}
      slotProps={{
        ...props?.slotProps,
        root: {
          'aria-label': 'content',
          ...props?.slotProps?.root,
        },
      }}
    />
  );
}
