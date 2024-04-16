import { ObjectId } from 'mongodb';
import {
  RelayPagination,
  getPaginationKey,
} from '../../../mongodb/operations/pagination/relayArrayPagination';
import mapObject from 'map-obj';
import { multiRelayArrayPaginationMapOutputToInput } from '../../../mongodb/operations/pagination/relayMultiArrayPaginationConcat';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from '../../../mongodb/operations/pagination/relayPaginateUserNotesArray';
import {
  DeepQuery,
  DeepQueryResponse,
  mergeQueries,
} from '../../../mongodb/query-builder';
import { NoteQuery } from '../mongo-query-mapper/note';
import groupByUserId from './utils/groupByUserId';
import userNoteQueryPaginationMappedToResponse from './utils/userNoteQueryPaginationMappedToResponse';
import userNoteQueryToLookupInput from './utils/userNoteQueryToLookupInput';
import userNoteResponseToPaginationsMapped from './utils/userNoteResponseToPaginationsMapped';
import { UserNoteDeepQueryResponse } from './UserNoteDeepQueryResponse';
import { CollectionName } from '../../../mongodb/collections';
import { GraphQLResolversContext } from '../../context';

export interface NoteConnectionKey {
  /**
   * User who has array of UserNotes in User document.
   */
  userId: ObjectId;
  /**
   * Path to array field with UserNote._id in User document.
   */
  userNotesArrayPath: string;
  /**
   * Array pagination
   */
  pagination: RelayPagination<ObjectId>;
  /**
   * Fields to retrieve, inclusion projection.
   */
  noteQuery: DeepQuery<NoteQuery>;
}

export interface NoteConnectionBatchLoadContext {
  mongodb: {
    collections: Pick<
      GraphQLResolversContext['mongodb']['collections'],
      | CollectionName.Users
      | CollectionName.UserNotes
      | CollectionName.CollabTexts
      | CollectionName.Notes
    >;
  };
}

export default async function noteConnectionBatchLoad(
  keys: Readonly<NoteConnectionKey[]>,
  context: Readonly<NoteConnectionBatchLoadContext>
): Promise<(DeepQueryResponse<NoteQuery>[] | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const userNotesBy_userId_arrayPath_paginationKey = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserKeys.map(({ noteQuery }) => noteQuery)
        );

        const allPaginationsByArrayPath = sameUserKeys.reduce<
          Record<string, { paginations: RelayPagination<ObjectId>[] }>
        >((map, { pagination, userNotesArrayPath }) => {
          const existing = map[userNotesArrayPath];
          if (existing) {
            existing.paginations.push(pagination);
          } else {
            map[userNotesArrayPath] = { paginations: [pagination] };
          }
          return map;
        }, {});

        // Build userNote aggregate query
        const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

        const userNotesResults = await context.mongodb.collections[CollectionName.Users]
          .aggregate<RelayPaginateUserNotesArrayOuput<UserNoteDeepQueryResponse>>([
            {
              $match: {
                _id: userId,
              },
            },
            ...relayPaginateUserNotesArray({
              pagination: allPaginationsByArrayPath,
              userNotes: {
                userNoteCollctionName:
                  context.mongodb.collections[CollectionName.UserNotes].collectionName,
                userNoteLookupInput,
              },
            }),
          ])
          .toArray();

        const userNotesResult = userNotesResults[0];
        if (!userNotesResult) {
          throw new Error(`Expected User aggregate to return data`);
        }

        const userNotesByQueryPaginations = multiRelayArrayPaginationMapOutputToInput(
          mapObject(allPaginationsByArrayPath, (path, { paginations }) => [
            path,
            paginations,
          ]),
          userNotesResult.userNotes
        );

        const userNotesBy_arrayPath_paginationKey = mapObject(
          allPaginationsByArrayPath,
          (path, allPaginations) => {
            const mappedPaginations = userNotesByQueryPaginations[path];
            if (!mappedPaginations) {
              throw new Error(`Notes not found for path ${path}`);
            }

            const userNotesByPaginationKey: Record<string, UserNoteDeepQueryResponse[]> =
              {};
            for (let i = 0; i < allPaginations.paginations.length; i++) {
              const pagination = allPaginations.paginations[i];
              if (!pagination) continue;
              const userNotes = mappedPaginations[i];
              if (!userNotes) continue;

              userNotesByPaginationKey[getPaginationKey(pagination)] = userNotes;
            }

            return [path, userNotesByPaginationKey];
          }
        );

        return [userIdStr, userNotesBy_arrayPath_paginationKey];
      })
    )
  ) as Record<string, Record<string, Record<string, UserNoteDeepQueryResponse[]>>>;

  return keys.map((key) => {
    const userNotes =
      userNotesBy_userId_arrayPath_paginationKey[key.userId.toString()]?.[
        key.userNotesArrayPath
      ]?.[getPaginationKey(key.pagination)];
    if (!userNotes) {
      throw new Error(
        `Notes not found for pagination ${getPaginationKey(key.pagination)}`
      );
    }

    const userNotesPaginationsMapped = userNotes.map((userNote) =>
      userNoteResponseToPaginationsMapped(userNote, mergeQueries({}, [key.noteQuery]))
    );

    return userNotesPaginationsMapped.map((userNote) =>
      userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery)
    );
  });
}
