import { ObjectId } from 'mongodb';
import { assertAuthenticated } from '../../../../../services/auth/auth';
import { NoteCategory, type QueryResolvers } from '../../../types.generated';
import {
  PreFetchedArrayGetItemFn,
  withPreExecuteList,
} from '../../../../utils/pre-execute';
import { QueryableNote } from '../../../../../mongodb/loaders/note/descriptions/note';
import { UserNoteLinkMapper } from '../../schema.mappers';
import { QueryableUser_NotesCategory } from '../../../../../mongodb/loaders/user/description';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { createMapQueryFn } from '../../../../../mongodb/query/query';
import { Note_id_fromQueryFn } from '../../../../../services/note/note-id';
import { CursorPagination } from '../../../../../mongodb/pagination/cursor-struct';

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
      notes: {
        category: {
          [categoryName]: {
            ...query,
            order: {
              ...query.order,
              items: {
                ...query.order?.items,
                $pagination: pagination,
              },
            },
          },
        },
      },
    }),
    (user) => user.notes.category[categoryName]
  );

  const createUserNoteLinkMapper: PreFetchedArrayGetItemFn<UserNoteLinkMapper> = (
    index,
    updateSize
  ) => ({
    userId: currentUserId,
    query: createMapQueryFn(noteCategoryQueryFn)<QueryableNote>()(
      (query) => ({
        order: {
          items: query,
        },
      }),
      (noteCategory) => {
        const items = noteCategory.order.items;
        updateSize?.(items.length);
        return items[index < 0 ? index + items.length : index];
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
          order: {
            firstId: 1,
            items: {
              _id: 1,
            },
          },
        });

        const order = noteCategory?.order;
        const startCursor = order?.items[0]?._id;
        const firstCursor = order?.firstId;

        const hasPreviousPage = startCursor && !startCursor.equals(firstCursor);

        return hasPreviousPage ?? false;
      },
      hasPreviousPage: async () => {
        const noteCategory = await noteCategoryQueryFn({
          order: {
            lastId: 1,
            items: {
              _id: 1,
            },
          },
        });

        const order = noteCategory?.order;
        const endCursor = order?.items[order.items.length - 1]?._id;
        const lastCursor = order?.lastId;

        const hasNextPage = endCursor && !endCursor.equals(lastCursor);

        return hasNextPage ?? false;
      },
      startCursor: async () =>
        objectIdToStr(await Note_id_fromQueryFn(createUserNoteLinkMapper(-1).query)),
      endCursor: async () =>
        objectIdToStr(await Note_id_fromQueryFn(createUserNoteLinkMapper(0).query)),
    },
  };
};
