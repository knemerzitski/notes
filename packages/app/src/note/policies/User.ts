import { isReference } from '@apollo/client';
import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { isDefined } from '~utils/type-guards/is-defined';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { updateUserNoteLinkOutdated } from '../models/note/outdated';
import { throwNoteNotFoundError } from '../utils/errors';
import { getUserNoteLinkId } from '../utils/id';

export const User: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
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
        preserveEdgeInPosition(edge, { readField }) {
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
        // Never remove any edges
        preserveUnknownIndexEdges(missingEdges, { readField, cache }) {
          // Mark note outdated
          missingEdges.forEach((edge) => {
            const node = readField('node', edge);
            if (!isReference(node)) {
              return;
            }

            const id = readField('id', node);
            if (typeof id !== 'string') {
              return;
            }

            updateUserNoteLinkOutdated(id, true, cache);
          });

          return true;
        },
        /**
         * Currently noteLinkConnection cursors are derived from Note.id
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
      noteLinkSearchConnection: relayStylePagination(['searchText'], {
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
        isOrderedSet: true,
      }),
      allNoteLinks: {
        keyArgs: false,
        read(_existing, { readField }) {
          const seenRefs = new Set<string>();

          // Go through every single category and concat arrays
          return (
            [
              ...objectValueArrayPermutationsValues({
                category: Object.values(NoteCategory),
              }),
            ]
              // Collect edges
              .flatMap((args) => {
                const noteLinkConnection = readField({
                  fieldName: 'noteLinkConnection',
                  args,
                });

                // Is obj with property `edges`
                if (
                  !isObjectLike(noteLinkConnection) ||
                  !('edges' in noteLinkConnection)
                ) {
                  return;
                }

                // `edges` is array
                if (!Array.isArray(noteLinkConnection.edges)) {
                  return;
                }

                return noteLinkConnection.edges as unknown[];
              })
              .map((userNoteLinkEdge) => {
                if (!isObjectLike(userNoteLinkEdge)) {
                  return;
                }

                if (!('node' in userNoteLinkEdge)) {
                  return;
                }

                const userNoteLink = userNoteLinkEdge.node;
                if (!isReference(userNoteLink)) {
                  return;
                }

                // Filter duplicated
                if (seenRefs.has(userNoteLink.__ref)) {
                  return;
                }
                seenRefs.add(userNoteLink.__ref);

                return userNoteLink;
              })
              .filter(isDefined)
          );
        },
      },
    },
  };
};
