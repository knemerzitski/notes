import { ObjectId } from 'mongodb';

import { QueryableNote } from '../../../../../mongodb/loaders/note/descriptions/note';
import { QueryableUser_NotesCategory } from '../../../../../mongodb/loaders/user/description';
import { CursorPagination } from '../../../../../mongodb/pagination/cursor-struct';
import { createMapQueryFn } from '../../../../../mongodb/query/query';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { Note_id_fromQueryFn } from '../../../../../services/note/note-id';
import {
  PreFetchedArrayGetItemFn,
  withPreExecuteList,
} from '../../../../utils/pre-execute';
import { NoteCategory, type QueryResolvers } from '../../../types.generated';
import { UserNoteLinkMapper } from '../../schema.mappers';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

export const userNoteLinkConnection: NonNullable<
  QueryResolvers['userNoteLinkConnection']
> = (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;

  assertAuthenticated(auth);
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
    userNoteLinks: (ctx, info) => {
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
};
