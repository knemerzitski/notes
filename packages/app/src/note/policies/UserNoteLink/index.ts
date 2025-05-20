import { Maybe } from '../../../../../utils/src/types';

import { CollabService } from '../../../../../collab/src';
import { NoteCategory, NoteTextFieldName } from '../../../__generated__/graphql';
import { DateTimeNullable } from '../../../graphql/scalars/DateTime';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';

import { parseUserNoteLinkId } from '../../utils/id';
import { readUserNoteLinkId } from '../../utils/read-user-note-link-id';

import { _external, readExternalState } from './_external';

export const UserNoteLink: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      external: _external(ctx),
      collabService(_existing, options): CollabService {
        return readExternalState(
          readUserNoteLinkId(options),
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
          userNoteLinkId: readUserNoteLinkId(options),
          fieldName: name as NoteTextFieldName,
        };
      },
      textFields(_existing, options) {
        const { readField } = options;

        return ctx.custom.userNoteLink.externalState.fieldNames.map((fieldName) => ({
          __typename: 'NoteTextField',
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          id: readField('id') as string,
          userNoteLinkId: readUserNoteLinkId(options),
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
      note(existing, { readField, toReference }) {
        const id = readField('id');
        if (typeof id !== 'string') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        }

        const { noteId } = parseUserNoteLinkId(id);

        return toReference({
          __typename: 'Note',
          id: noteId,
        });
      },
      user(existing, { readField, toReference }) {
        const id = readField('id');
        if (typeof id !== 'string') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        }

        const { userId } = parseUserNoteLinkId(id);

        return toReference({
          __typename: 'User',
          id: userId,
        });
      },
    },
  };
};
