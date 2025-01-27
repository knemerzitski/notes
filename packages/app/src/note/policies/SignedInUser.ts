import { isObjectLike } from '~utils/type-guards/is-object-like';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { throwNoteNotFoundError } from '../utils/errors';
import { getUserNoteLinkId } from '../utils/id';

export const SignedInUser: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      noteLink: {
        keyArgs: false,
        read(_existing, { args, toReference, readField }) {
          if (!args || !isObjectLike(args)) {
            throwNoteNotFoundError();
          }

          const by = args.by;
          if (!isObjectLike(by)) {
            throwNoteNotFoundError();
          }

          const noteId = by.id;
          if (typeof noteId !== 'string') {
            throwNoteNotFoundError(String(noteId));
          }

          const userId = readField('id');
          if (typeof userId !== 'string') {
            throwNoteNotFoundError(noteId);
          }

          return toReference({
            __typename: 'UserNoteLink',
            id: getUserNoteLinkId(noteId, userId),
          });
        },
        merge: false,
      },
      note: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          if (!args || !isObjectLike(args)) {
            throwNoteNotFoundError();
          }

          const by = args.by;
          if (!isObjectLike(by)) {
            throwNoteNotFoundError();
          }

          const noteId = by.id;
          if (typeof noteId !== 'string') {
            throwNoteNotFoundError(String(noteId));
          }

          return toReference({
            __typename: 'Note',
            id: noteId,
          });
        },
        merge: false,
      },
    },
  };
};
