import { useEffect, useState } from 'react';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../types';

import { useCollabFacade } from './useCollabFacade';

// textField is derived from headText
const _UseTextFieldValue_NoteFragment = gql(`
  fragment UseTextFieldValue_NoteFragment on Note {
    id
    collabText {
      id
      headRecord {
        revision
        text
      }
    }
  }
`);

export function useTextFieldValue(fieldName: NoteTextFieldName) {
  const collabFacade = useCollabFacade();

  const field = collabFacade.fieldCollab.getField(fieldName);

  const [value, setValue] = useState(field.value);

  useEffect(
    () =>
      field.on('value:changed', ({ newValue }) => {
        setValue(newValue);
      }),
    [field]
  );

  return value;
}
