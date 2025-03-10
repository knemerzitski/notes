import {
  FieldFunctionOptions,
  isReference,
  Reference,
  StoreObject,
} from '@apollo/client';

import { objectValueArrayPermutationsValues } from '../../../../utils/src/object/object-value-array-permutations';
import { isDefined } from '../../../../utils/src/type-guards/is-defined';
import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { updateUserNoteLinkOutdated } from '../models/note/outdated';
import { throwNoteNotFoundError } from '../utils/errors';
import { getUserNoteLinkId } from '../utils/id';

function filterNoteLinkInList(
  noteLink: StoreObject | Reference,
  {
    readField,
    logger,
  }: Pick<FieldFunctionOptions, 'readField'> & Pick<TypePoliciesContext, 'logger'>
): boolean {
  let keepNoteLink = true;

  const hiddenInList = readField('hiddenInList', noteLink);
  if (typeof hiddenInList === 'boolean') {
    keepNoteLink = !hiddenInList;
  }

  if (!keepNoteLink) {
    logger?.debug('hiddenInList', noteLink.__ref);
  }

  return keepNoteLink;
}

function getEdgeNode(
  edge: StoreObject | Reference,
  { readField }: Pick<FieldFunctionOptions, 'readField'>
): Reference | undefined {
  const node = readField('node', edge);
  if (isReference(node)) {
    return node;
  }

  return;
}

function filterEdge(
  edge: StoreObject | Reference,
  options: Pick<FieldFunctionOptions, 'readField'> & Pick<TypePoliciesContext, 'logger'>
) {
  const noteLink = getEdgeNode(edge, options);
  if (!noteLink) {
    return true;
  }
  return filterNoteLinkInList(noteLink, options);
}

export const User: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
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
          },
          options
        ) {
          if (!existing) {
            return existing;
          }

          return {
            ...existing,
            edges: existing.edges.filter((edge) =>
              filterEdge(edge, { ...options, logger: ctx.logger })
            ),
          };
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
          },
          options
        ) {
          if (!existing) {
            return existing;
          }

          return {
            ...existing,
            edges: existing.edges.filter((edge) =>
              filterEdge(edge, { ...options, logger: ctx.logger })
            ),
          };
        },
        isOrderedSet: true,
      }),
      allNoteLinks: {
        keyArgs: false,
        read(_existing, options) {
          const { readField } = options;

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

                if (
                  !filterNoteLinkInList(userNoteLink, { ...options, logger: ctx.logger })
                ) {
                  return;
                }

                return userNoteLink;
              })
              .filter(isDefined)
          );
        },
      },
    },
  };
};
