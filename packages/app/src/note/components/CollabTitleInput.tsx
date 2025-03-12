import { InputProps } from '@mui/material';

import { NoteTextFieldName } from '../../__generated__/graphql';

import { CollabInput, CollabInputProps } from './CollabInput';
import { TitleInput } from './TitleInput';

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
