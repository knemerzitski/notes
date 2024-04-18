import { Document, ObjectId } from 'mongodb';
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
import isEqual from 'lodash.isequal';

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
  /**
   * Any custom projection on UserSchema.
   */
  customQuery?: {
    query: Document;
    group: Document;
  };
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

export type NoteConnectionBatchLoadOutput<
  TCustomQuery extends Record<string, unknown> = Record<string, never>,
> = {
  userNotes: DeepQueryResponse<NoteQuery>[];
} & TCustomQuery;

export default async function noteConnectionBatchLoad<
  TCustomQuery extends Record<string, unknown> = Record<string, never>,
>(
  keys: Readonly<NoteConnectionKey[]>,
  context: Readonly<NoteConnectionBatchLoadContext>
): Promise<(NoteConnectionBatchLoadOutput<TCustomQuery> | Error)[]> {
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

        const allUniquePaginationsByArrayPath = mapObject(
          sameUserKeys.reduce<Record<string, Record<string, RelayPagination<ObjectId>>>>(
            (map, { pagination, userNotesArrayPath }) => {
              const existing = map[userNotesArrayPath];
              if (existing) {
                existing[getPaginationKey(pagination)] = pagination;
              } else {
                map[userNotesArrayPath] = { [getPaginationKey(pagination)]: pagination };
              }
              return map;
            },
            {}
          ),
          (arrPath, pagMap) => [arrPath, { paginations: Object.values(pagMap) }]
        );

        // Build userNote aggregate query
        const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

        // Custom query and group
        const mergedCustomQuery = {
          query: groupEqualObjects(
            sameUserKeys,
            (loadKey) => loadKey.customQuery?.query,
            (duplicateKey) => {
              throw new Error(
                `noteConnection customQuery.query key conflict: '${duplicateKey}'. Same key cannot contain different values`
              );
            }
          ),
          group: groupEqualObjects(
            sameUserKeys,
            (loadKey) => loadKey.customQuery?.group,
            (duplicateKey) => {
              throw new Error(
                `noteConnection customQuery.group key conflict: '${duplicateKey}'. Same key cannot contain different values`
              );
            }
          ),
        };

        const userNotesResults = await context.mongodb.collections[CollectionName.Users]
          .aggregate<
            RelayPaginateUserNotesArrayOuput<UserNoteDeepQueryResponse> & TCustomQuery
          >([
            {
              $match: {
                _id: userId,
              },
            },
            ...relayPaginateUserNotesArray({
              customProject: mergedCustomQuery.query,
              pagination: allUniquePaginationsByArrayPath,
              userNotes: {
                userNoteCollctionName:
                  context.mongodb.collections[CollectionName.UserNotes].collectionName,
                userNoteLookupInput,
                groupExpression: mergedCustomQuery.group,
              },
            }),
          ])
          .toArray();
        const userNotesResult = userNotesResults[0] ?? {
          userNotes: {
            array: [],
            multiSizes: [],
          },
        };

        const userNotesByQueryPaginations = multiRelayArrayPaginationMapOutputToInput(
          mapObject(allUniquePaginationsByArrayPath, (path, { paginations }) => [
            path,
            paginations,
          ]),
          userNotesResult.userNotes
        );

        const userNotesBy_arrayPath_paginationKey = mapObject(
          allUniquePaginationsByArrayPath,
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

        return [
          userIdStr,
          {
            ...userNotesResult,
            userNotes: userNotesBy_arrayPath_paginationKey,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      userNotes: Record<string, Record<string, UserNoteDeepQueryResponse[]>>;
    } & TCustomQuery
  >;

  return keys.map((key) => {
    const userData = userNotesBy_userId_arrayPath_paginationKey[key.userId.toString()];
    if (!userData) {
      throw new Error(`Expected user data from notesConnection aggregate`);
    }

    const userNotes =
      userData.userNotes[key.userNotesArrayPath]?.[getPaginationKey(key.pagination)];
    if (!userNotes) {
      throw new Error(
        `Notes not found for pagination ${getPaginationKey(key.pagination)}`
      );
    }

    const userNotesPaginationsMapped = userNotes.map((userNote) =>
      userNoteResponseToPaginationsMapped(userNote, mergeQueries({}, [key.noteQuery]))
    );

    const userNotesMapped = userNotesPaginationsMapped.map((userNote) =>
      userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery)
    );

    return {
      ...userData,
      userNotes: userNotesMapped,
    };
  });
}

function groupEqualObjects<T>(
  values: T[],
  getTarget: (value: T) => Record<string, unknown> | undefined,
  onDuplicateKey: (value: string) => void
): Record<string, unknown> {
  return values.reduce<Record<string, unknown>>((groupedValue, value) => {
    const target = getTarget(value);
    if (!target) {
      return groupedValue;
    }
    for (const key of Object.keys(target)) {
      if (key in groupedValue) {
        if (!isEqual(groupedValue[key], target[key])) {
          onDuplicateKey(key);
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        groupedValue[key] = target[key];
      }
    }

    return groupedValue;
  }, {});
}
