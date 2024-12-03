import { FieldFunctionOptions } from '@apollo/client/cache';

import { NoteTextFieldName } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

import { readNoteRef } from '../utils/read-note-ref';

import { readNoteExternalState } from './Note/_external';


function readFieldName({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>): NoteTextFieldName {
  const fieldName = readField('fieldName');
  if (fieldName == null) {
    throw new Error('Expected NoteTextField.fieldName to be defined');
  }
  return fieldName as NoteTextFieldName;
}

export const NoteTextField: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      value(_existing, options) {
        const externalState = readNoteExternalState(readNoteRef(options), options);
        const field = externalState.fields[readFieldName(options)];

        return field.valueVar();
      },
      editor(_existing, options) {
        const externalState = readNoteExternalState(readNoteRef(options), options);
        const field = externalState.fields[readFieldName(options)];

        return field.editor;
      },
    },
  };
};
