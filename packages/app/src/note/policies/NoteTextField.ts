import { FieldFunctionOptions } from '@apollo/client/cache';

import { NoteTextFieldName } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

import { readUserNoteLinkRef } from '../utils/read-user-note-link-ref';

import { readExternalState } from './UserNoteLink/_external';

function readFieldName({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>): NoteTextFieldName {
  const fieldName = readField('fieldName');
  if (typeof fieldName !== 'string') {
    throw new Error('Expected NoteTextField parent to pass field "fieldName"');
  }
  return fieldName as NoteTextFieldName;
}

export const NoteTextField: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      value(_existing, options) {
        const externalState = readExternalState(
          readUserNoteLinkRef(options),
          options,
          ctx.custom.userNoteLink.externalState
        );
        const field = externalState.fields[readFieldName(options)];

        return field.valueVar();
      },
      editor(_existing, options) {
        const externalState = readExternalState(
          readUserNoteLinkRef(options),
          options,
          ctx.custom.userNoteLink.externalState
        );
        const field = externalState.fields[readFieldName(options)];

        return field.editor;
      },
      name(_existing, options) {
        return readFieldName(options);
      },
    },
  };
};
