import { isReference } from '@apollo/client';
import Fuse from 'fuse.js';
import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { isDefined } from '~utils/type-guards/is-defined';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { relayStylePagination } from '../../graphql/utils/relay-style-pagination';
import { throwNoteNotFoundError } from '../utils/errors';
import { getUserNoteLinkId } from '../utils/id';




import { readNoteExternalState } from './Note/_external';

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
      }),
    },
  };
};
