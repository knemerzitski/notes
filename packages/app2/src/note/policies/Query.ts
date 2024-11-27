import { isObjectLike } from '~utils/type-guards/is-object-like';
import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';
import { getUserNoteLinkId } from '../utils/id';
import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { isReference } from '@apollo/client';

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      userNoteLink: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          // Read using UserNoteLinkByInput (argument by)
          if (!args || !isObjectLike(args)) {
            return null;
          }
          const by = args.by;
          if (!isObjectLike(by)) {
            return null;
          }

          if (typeof by.noteId === 'string') {
            const userId = ctx.appContext.userId;
            if (userId == null) {
              return null;
            }

            return toReference({
              __typename: 'UserNoteLink',
              id: getUserNoteLinkId(by.noteId, userId),
            });
          }

          const id = by.id ?? by.userNoteLinkId;
          if (typeof id !== 'string') {
            return null;
          }

          return toReference({
            __typename: 'UserNoteLink',
            id,
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
