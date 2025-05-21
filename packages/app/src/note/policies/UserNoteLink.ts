import { Maybe } from '../../../../utils/src/types';

import { NoteCategory } from '../../__generated__/graphql';
import { DateTimeNullable } from '../../graphql/scalars/DateTime';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

import { parseUserNoteLinkId } from '../utils/id';

export const UserNoteLink: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
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
      viewText(existing: string, { readField, isReference }): string {
        if (existing) {
          return existing;
        }

        const note = readField('note');
        if (!isReference(note)) {
          return '';
        }

        const collabText = readField('collabText', note);
        if (!isReference(collabText)) {
          return '';
        }

        const headRecord = readField('headRecord', collabText);
        if (!headRecord) {
          return '';
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        return readField('text', headRecord as any) ?? '';
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
