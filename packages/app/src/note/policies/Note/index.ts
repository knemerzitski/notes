import { Reference } from '@apollo/client';
import { CollabService } from '~collab/client/collab-service';

import { NoteTextFieldName } from '../../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { fieldArrayToMap } from '../../../graphql/utils/field-array-to-map';
import { isLocalId } from '../../../utils/is-local-id';
import { readNoteRef } from '../../utils/read-note-ref';

import { _external, readNoteExternalState } from './_external';

interface TextFieldsResult {
  __typename: 'NoteTextField';
  id: string;
  noteRef: Reference;
  fieldName: NoteTextFieldName;
}

export const Note: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      _external: _external(ctx),
      collabService(_existing, options): CollabService {
        return readNoteExternalState(readNoteRef(options), options).service;
      },
      textField(_existing, options): TextFieldsResult {
        const { readField, args } = options;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const name = args?.name;
        if (typeof name !== 'string') {
          throw new Error(`Expected arg "name" to be a string but is "${String(name)}"`);
        }

        return {
          __typename: 'NoteTextField',
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          id: readField('id') as string,
          noteRef: readNoteRef(options),
          fieldName: name as NoteTextFieldName,
        };
      },
      localOnly(_existing, { readField }) {
        const id = readField('id');
        return isLocalId(id);
      },
      shareAccess(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      users: fieldArrayToMap('__ref', {
        read(existing = {}) {
          return existing;
        },
      }),
    },
  };
};
