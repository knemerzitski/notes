import { isObjectLike } from '~utils/type-guards/is-object-like';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { throwNoteNotFoundError } from '../utils/errors';
import { getUserNoteLinkId } from '../utils/id';
import { isReference } from '@apollo/client';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';

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
      noteLinkConnection: relayStylePagination(['category'], {
        read(
          existing = {
            __typename: 'UserNoteLinkConnection',
            edges: [],
            pageInfo: {
              hasPreviousPage: false,
              hasNextPage: false,
              startCursor: null,
              endCursor: null,
            },
          }
        ) {
          return existing;
        },
        // Preserve local edges (when merging incoming from server) by checking node.note.localOnly
        preserveEdge(edge, { readField }) {
          const node = readField('node', edge);
          if (!isReference(node)) {
            return false;
          }

          const note = readField('note', node);
          if (!isReference(note)) {
            return false;
          }

          return !!readField('localOnly', note);
        },
        /**
         * Currently userNoteLinkConnection cursors are derived from Note.id
         * and can be read from edge.
         */
        getCursor(edge, { readField }) {
          if (!edge) {
            return;
          }

          const node = readField('node', edge);
          if (!isReference(node)) {
            return;
          }

          const note = readField('note', node);
          if (!isReference(note)) {
            return;
          }

          const noteId = readField('id', note);
          if (typeof noteId === 'string') {
            return noteId;
          }
          return;
        },
        isOrderedSet: true,
      }),
    },
  };
};
