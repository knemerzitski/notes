import { isReference } from '@apollo/client';
import Fuse from 'fuse.js';
import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { isDefined } from '~utils/type-guards/is-defined';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';
import { getUserNoteLinkId } from '../utils/id';

import { readNoteExternalState } from './Note/_external';
import { throwNoteNotFoundError } from '../utils/errors';

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
      userNoteLinkSearchConnection: relayStylePagination(
        keyArgsWithUserId(ctx, ['searchText']),
        {
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
            },
            options
          ) {
            const { args, readField } = options;

            const searchText = args?.searchText ? String(args.searchText) : '';
            if (searchText.length === 0) {
              return existing;
            }

            // Gather text of every edge for Fuse
            // It's okay to recreate Fuse instance for small datasets
            // Might have to reuse the instance if it's going to have a performance impact
            const itemsForFuse = [
              ...objectValueArrayPermutationsValues({
                category: Object.values(NoteCategory),
              }),
            ]
              // Collect edges
              .flatMap((args) => {
                const userNoteLinkConnection = readField({
                  fieldName: 'userNoteLinkConnection',
                  args,
                });

                // Is obj with property `edges`
                if (
                  !isObjectLike(userNoteLinkConnection) ||
                  !('edges' in userNoteLinkConnection)
                ) {
                  return;
                }

                // `edges` is array
                if (!Array.isArray(userNoteLinkConnection.edges)) {
                  return;
                }

                return userNoteLinkConnection.edges as unknown[];
              })
              // Add text
              .map((userNoteLinkEdge) => {
                if (!isObjectLike(userNoteLinkEdge)) {
                  return;
                }

                if (!('node' in userNoteLinkEdge)) {
                  return;
                }

                const userNoteLinkRef = userNoteLinkEdge.node;
                if (!isReference(userNoteLinkRef)) {
                  return;
                }

                const noteRef = readField('note', userNoteLinkRef);
                if (!isReference(noteRef)) {
                  return;
                }

                const externalState = readNoteExternalState(noteRef, options);
                const text = externalState.service.viewText;

                return {
                  text,
                  node: userNoteLinkRef,
                };
              })
              .filter(isDefined);

            // Use fuse.js fuzzy search
            const fuse = new Fuse(itemsForFuse, {
              keys: ['text'],
            });
            const searchResult = fuse.search(searchText);
            searchResult.reverse();

            return {
              __typename: 'UserNoteLinkConnection',
              edges: searchResult.map(({ item }) => item),
              pageInfo: {
                hasPreviousPage: false,
                hasNextPage: false,
                startCursor: null,
                endCursor: null,
              },
            };
          },
          isOrderedSet: true,
        }
      ),
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
