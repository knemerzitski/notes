import { ObjectId } from 'mongodb';

import { QueryableNote } from '../../../../mongodb/loaders/note/descriptions/note';
import { QueryableSearchNote } from '../../../../mongodb/loaders/notes-search/description';
import { QueryableUser_NotesCategory } from '../../../../mongodb/loaders/user/description';
import { CursorPagination } from '../../../../mongodb/pagination/cursor-struct';
import { createMapQueryFn, MongoQueryFn } from '../../../../mongodb/query/query';
import { objectIdToStr } from '../../../../mongodb/utils/objectid';
import { Note_id_fromQueryFn } from '../../../../services/note/note-id';
import { PreFetchedArrayGetItemFn, withPreExecuteList } from '../../../utils/pre-execute';
import { UserNoteLinkMapper } from '../schema.mappers';

import { NoteCategory, type SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<
  SignedInUserResolvers,
  'noteLink' | 'noteLinkConnection' | 'noteLinkSearchConnection'
> = {
  noteLink: ({ auth }, { by }, { mongoDB }) => {
    const userId = auth.session.userId;
    const noteId = by.id;

    return {
      userId,
      query: mongoDB.loaders.note.createQueryFn({
        userId,
        noteId,
      }),
    };
  },
  noteLinkConnection: ({ auth }, arg, ctx) => {
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 30;

    const { mongoDB } = ctx;

    const currentUserId = auth.session.userId;

    const first = arg.first != null ? Math.min(MAX_LIMIT, arg.first) : DEFAULT_LIMIT;
    const last = arg.last != null ? Math.min(MAX_LIMIT, arg.last) : DEFAULT_LIMIT;
    const after = arg.after ?? undefined;
    const before = arg.before ?? undefined;

    const isForwardPagination = arg.before != null || arg.last != null;

    let pagination: CursorPagination<ObjectId>;
    if (isForwardPagination) {
      pagination = {
        after: before,
        first: last,
      };
    } else {
      pagination = {
        before: after,
        last: first,
      };
    }

    const categoryName = arg.category ?? NoteCategory.DEFAULT;

    const userQueryFn = mongoDB.loaders.user.createQueryFn({
      userId: currentUserId,
    });

    const noteCategoryQueryFn = createMapQueryFn(
      userQueryFn
    )<QueryableUser_NotesCategory>()(
      (query) => ({
        _id: 1,
        note: {
          categories: {
            [categoryName]: {
              ...query,
              notes: {
                ...query.notes,
                $pagination: pagination,
              },
            },
          },
        },
      }),
      (user) => user.note.categories[categoryName]
    );

    const createUserNoteLinkMapper: PreFetchedArrayGetItemFn<UserNoteLinkMapper> = (
      index,
      updateSize
    ) => ({
      userId: currentUserId,
      query: createMapQueryFn(noteCategoryQueryFn)<QueryableNote>()(
        (query) => ({
          notes: query,
        }),
        (noteCategory) => {
          const notes = noteCategory.notes;
          updateSize?.(notes.length);

          let reversedIndex = index;
          if (reversedIndex < 0) {
            reversedIndex += notes.length;
          }
          reversedIndex = notes.length - reversedIndex - 1;

          return notes[reversedIndex];
        }
      ),
    });

    return {
      noteLinks: (ctx, info) => {
        return withPreExecuteList(createUserNoteLinkMapper, ctx, info);
      },
      edges: (ctx, info) => {
        return withPreExecuteList(
          (index, updateSize) => {
            const userNoteLinkMapper = createUserNoteLinkMapper(index, updateSize);

            return {
              node: userNoteLinkMapper,
              cursor: async () =>
                objectIdToStr(await Note_id_fromQueryFn(userNoteLinkMapper.query)),
            };
          },
          ctx,
          info
        );
      },
      pageInfo: {
        hasNextPage: async () => {
          const noteCategory = await noteCategoryQueryFn({
            firstNoteId: 1,
            notes: {
              _id: 1,
            },
          });

          const notes = noteCategory?.notes;
          const startCursor = notes?.[0]?._id;
          const firstCursor = noteCategory?.firstNoteId;

          const hasPreviousPage = startCursor && !startCursor.equals(firstCursor);

          return hasPreviousPage ?? false;
        },
        hasPreviousPage: async () => {
          const noteCategory = await noteCategoryQueryFn({
            lastNoteId: 1,
            notes: {
              _id: 1,
            },
          });

          const notes = noteCategory?.notes;
          const endCursor = notes?.[notes.length - 1]?._id;
          const lastCursor = noteCategory?.lastNoteId;

          const hasNextPage = endCursor && !endCursor.equals(lastCursor);

          return hasNextPage ?? false;
        },
        startCursor: async () =>
          objectIdToStr(await Note_id_fromQueryFn(createUserNoteLinkMapper(0).query)),
        endCursor: async () =>
          objectIdToStr(await Note_id_fromQueryFn(createUserNoteLinkMapper(-1).query)),
      },
    };
  },
  noteLinkSearchConnection: async (_parent, arg, ctx) => {
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 30;

    const { services, mongoDB } = ctx;
    const auth = await services.requestHeaderAuth.getAuth();

    const currentUserId = auth.session.userId;

    const first = arg.first != null ? Math.min(MAX_LIMIT, arg.first) : DEFAULT_LIMIT;
    const last = arg.last != null ? Math.min(MAX_LIMIT, arg.last) : DEFAULT_LIMIT;
    const after = arg.after ?? undefined;
    const before = arg.before ?? undefined;

    const isForwardPagination = arg.after != null || arg.first != null;

    let basePaginationOffset: number;
    let basePaginationLength: number;
    let pagination: CursorPagination<string>;
    if (isForwardPagination) {
      basePaginationOffset = 0;
      basePaginationLength = first;
      pagination = {
        after,
        first: first + 1,
      };
    } else {
      basePaginationOffset = 1;
      basePaginationLength = last;
      pagination = {
        before,
        last: last + 1,
      };
    }

    const searchText = arg.searchText;

    function getSearchOffset(searchResultSize: number) {
      if (searchResultSize > basePaginationLength) {
        return basePaginationOffset;
      } else {
        return 0;
      }
    }

    function getSearchLength(searchResultSize: number) {
      return Math.min(searchResultSize, basePaginationLength);
    }

    const notesSearchQueryFn = mongoDB.loaders.notesSearch.createQueryFn({
      userId: currentUserId,
      searchText,
      pagination,
    });

    const createSearchNoteAtIndexQueryFn: PreFetchedArrayGetItemFn<
      MongoQueryFn<QueryableSearchNote>
    > = (index, updateSize) =>
      createMapQueryFn(notesSearchQueryFn)<QueryableSearchNote>()(
        (query) => query,
        (notes) => {
          updateSize?.(getSearchLength(notes.length));
          return notes[getSearchOffset(notes.length) + index];
        }
      );

    const createUserNoteLinkMapper: PreFetchedArrayGetItemFn<UserNoteLinkMapper> = (
      index,
      updateSize
    ) => ({
      userId: currentUserId,
      query: createMapQueryFn(
        createSearchNoteAtIndexQueryFn(index, updateSize)
      )<QueryableNote>()(
        (query) => ({ note: query }),
        (result) => result.note
      ),
    });

    return {
      noteLinks: (ctx, info) => {
        return withPreExecuteList(createUserNoteLinkMapper, ctx, info);
      },
      edges: (ctx, info) => {
        return withPreExecuteList(
          (index, updateSize) => {
            const userNoteLinkMapper = createUserNoteLinkMapper(index, updateSize);

            return {
              node: userNoteLinkMapper,
              cursor: async () =>
                (
                  await createSearchNoteAtIndexQueryFn(
                    index,
                    updateSize
                  )({
                    cursor: 1,
                  })
                )?.cursor,
            };
          },
          ctx,
          info
        );
      },
      pageInfo() {
        return {
          async hasNextPage() {
            if (isForwardPagination) {
              const searchResult = await notesSearchQueryFn({
                cursor: 1,
              });
              return searchResult != null && searchResult.length > basePaginationLength;
            } else {
              if (before) {
                const searchResult = await notesSearchQueryFn({
                  cursor: 1,
                });
                return searchResult != null && searchResult.length > 0;
              }
              return false;
            }
          },
          async hasPreviousPage() {
            if (isForwardPagination) {
              if (after) {
                const searchResult = await notesSearchQueryFn({
                  cursor: 1,
                });
                return searchResult != null && searchResult.length > 0;
              }
              return false;
            } else {
              const searchResult = await notesSearchQueryFn({
                cursor: 1,
              });
              return searchResult != null && searchResult.length > basePaginationLength;
            }
          },
          async startCursor() {
            const searchResult = await notesSearchQueryFn({
              cursor: 1,
            });
            return searchResult?.[getSearchOffset(searchResult.length)]?.cursor;
          },
          async endCursor() {
            const searchResult = await notesSearchQueryFn({
              cursor: 1,
            });
            return searchResult?.[getSearchLength(searchResult.length) - 1]?.cursor;
          },
        };
      },
    };
  },
};
