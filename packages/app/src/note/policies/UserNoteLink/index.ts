import { Maybe } from '../../../../../utils/src/types';

import { CollabService } from '../../../../../collab2/src';
import { NoteCategory, NoteTextFieldName } from '../../../__generated__/graphql';
import { DateTimeNullable } from '../../../graphql/scalars/DateTime';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';

import { readUserNoteLinkRef } from '../../utils/read-user-note-link-ref';

import { _external, readExternalState } from './_external';


export const UserNoteLink: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      _external: _external(ctx),
      collabService(_existing, options): CollabService {
        return readExternalState(
          readUserNoteLinkRef(options),
          options,
          ctx.custom.userNoteLink.externalState
        ).service;
      },
      textField(_existing, options) {
        const { readField, args } = options;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let name = args?.name;
        if (typeof name !== 'string') {
          throw new Error(`Expected arg "name" to be a string but is  "${String(name)}"`);
        }
        if (!Object.values(NoteTextFieldName).includes(name as NoteTextFieldName)) {
          name = NoteTextFieldName[name as keyof typeof NoteTextFieldName];
          if (name === undefined) {
            throw new Error(
              `Expected arg "name" to be a NoteTextFieldName but is  "${String(name)}"`
            );
          }
        }

        return {
          __typename: 'NoteTextField',
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          id: readField('id') as string,
          userNoteLinkRef: readUserNoteLinkRef(options),
          fieldName: name as NoteTextFieldName,
        };
      },
      textFields(_existing, options) {
        const { readField } = options;

        return ctx.custom.userNoteLink.externalState.fieldNames.map((fieldName) => ({
          __typename: 'NoteTextField',
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          id: readField('id') as string,
          userNoteLinkRef: readUserNoteLinkRef(options),
          fieldName,
        }));
      },
      categoryName(existing = NoteCategory.DEFAULT) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      originalCategoryName(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      deletedAt: DateTimeNullable,
      create(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      hiddenInList(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      pendingStatus(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      open: {
        read(existing = null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        },
        merge: true,
      },
      outdated(existing: Maybe<boolean> = false) {
        return existing;
      },
    },
  };
};
