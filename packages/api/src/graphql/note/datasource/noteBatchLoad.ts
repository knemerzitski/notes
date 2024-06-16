import { GraphQLError } from 'graphql';
import { AggregateOptions, ObjectId } from 'mongodb';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { CollectionName } from '../../../mongodb/collections';
import userNoteLookup from '../../../mongodb/operations/lookup/userNoteLookup';
import {
  DeepQuery,
  DeepQueryResponse,
  DeepQueryResponsePaginationMapped,
  mergeQueries,
} from '../../../mongodb/query-builder';
import { GraphQLResolversContext } from '../../context';
import { NoteQuery } from '../mongo-query-mapper/note';

import { UserNoteDeepQueryResponse } from './UserNoteDeepQueryResponse';
import groupByUserId from './utils/groupByUserId';
import userNoteQueryPaginationMappedToResponse from './utils/userNoteQueryPaginationMappedToResponse';
import userNoteQueryToLookupInput from './utils/userNoteQueryToLookupInput';
import userNoteResponseToPaginationsMapped from './utils/userNoteResponseToPaginationsMapped';


export interface NoteKey {
  /**
   * User who has a UserNote document.
   */
  userId: ObjectId;
  /**
   * publicId of Note.
   */
  publicId: string;
  /**
   * Fields to retrieve, inclusion projection.
   */
  noteQuery: DeepQuery<NoteQuery>;
}

export interface NoteBatchLoadContext {
  mongodb: {
    collections: Pick<
      GraphQLResolversContext['mongodb']['collections'],
      | CollectionName.UserNotes
      | CollectionName.CollabTexts
      | CollectionName.Notes
      | CollectionName.ShareNoteLinks
    >;
  };
}

export default async function noteBatchLoad(
  keys: Readonly<NoteKey[]>,
  context: Readonly<NoteBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResponse<NoteQuery> | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const userNotesBy_userId_publicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Gather publicIds
        const allPublicIds = sameUserKeys.map(({ publicId }) => publicId);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserKeys.map(({ noteQuery }) => noteQuery)
        );

        // Build aggregate query
        const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

        const userNotesResult = await context.mongodb.collections[
          CollectionName.UserNotes
        ]
          .aggregate<UserNoteDeepQueryResponse>(
            [
              {
                $match: {
                  userId,
                  'note.publicId': {
                    $in: allPublicIds,
                  },
                },
              },
              ...userNoteLookup(userNoteLookupInput),
            ],
            aggregateOptions
          )
          .toArray();

        // Map paginations to original query
        const userNotesBy_publicId = userNotesResult.reduce<
          Record<string, DeepQueryResponsePaginationMapped<NoteQuery>>
        >((retMap, userNote) => {
          const publicId = userNote.note?.publicId;
          if (!publicId) {
            throw new Error('Expected field note.publicId in UserNote response');
          }

          retMap[publicId] = userNoteResponseToPaginationsMapped(userNote, mergedQuery);

          return retMap;
        }, {});

        return [userIdStr, userNotesBy_publicId];
      })
    )
  ) as Record<string, Record<string, DeepQueryResponsePaginationMapped<NoteQuery>>>;

  return keys.map((key) => {
    const userNote = userNotesBy_userId_publicId[key.userId.toString()]?.[key.publicId];
    if (!userNote) {
      return new GraphQLError(`Note '${key.publicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NotFound,
        },
      });
    }

    return userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery);
  });
}
