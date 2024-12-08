import { isReference } from '@apollo/client';
import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { Note, NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';
import { getUserNoteLinkId } from '../utils/id';

function throwNoteNotFoundError(noteId?: Note['id']): never {
  if (noteId) {
    throw new Error(`Note "${noteId}" not found`);
  } else {
    throw new Error('Query is missing note id');
  }
}

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      userNoteLink: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          // Read using UserNoteLinkByInput (argument by)
          if (!args || !isObjectLike(args)) {
            throwNoteNotFoundError();
          }
          const by = args.by;
          if (!isObjectLike(by)) {
            throwNoteNotFoundError();
          }

          if (typeof by.noteId === 'string') {
            const userId = ctx.appContext.userId;
            if (userId == null) {
              throwNoteNotFoundError(by.noteId);
            }

            return toReference({
              __typename: 'UserNoteLink',
              id: getUserNoteLinkId(by.noteId, userId),
            });
          }

          const id = by.id ?? by.userNoteLinkId;
          if (typeof id !== 'string') {
            throwNoteNotFoundError(String(id));
          }

          return toReference({
            __typename: 'UserNoteLink',
            id,
          });
        },
        merge: false,
      },
      note: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          // Read using NoteByInput (argument by)
          if (!args || !isObjectLike(args)) {
            throwNoteNotFoundError();
          }
          const by = args.by;
          if (!isObjectLike(by)) {
            throwNoteNotFoundError();
          }

          if (typeof by.id !== 'string') {
            throwNoteNotFoundError(String(by.id));
          }
          return toReference({
            __typename: 'Note',
            id: by.id,
          });
        },
        merge: false,
      },
      userNoteLinkConnection: relayStylePagination(keyArgsWithUserId(ctx, ['category']), {
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

export const evictOptions: TaggedEvictOptionsList = [
  {
    tag: EvictTag.CURRENT_USER,
    options: [
      {
        id: 'ROOT_QUERY',
        fieldName: 'userNoteLink',
      },
      {
        id: 'ROOT_QUERY',
        fieldName: 'note',
      },
      // Evict all categories
      ...[
        ...objectValueArrayPermutationsValues({
          category: Object.values(NoteCategory),
        }),
      ].map((args) => ({
        id: 'ROOT_QUERY',
        fieldName: 'userNoteLinkConnection',
        args,
      })),
    ],
  },
];
