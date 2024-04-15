import mapObject from 'map-obj';
import {
  paginationStringToInt,
  getPaginationKey,
} from '../../../../mongodb/operations/pagination/relayArrayPagination';
import {
  assertRecordRevisionDefined,
  mapRevisionRecordsPaginationInputToOutput,
} from '../../../../mongodb/operations/pagination/revisionRecordsPagination';
import {
  MergedDeepQuery,
  DeepQueryResponsePaginationMapped,
} from '../../../../mongodb/query-builder';
import { CollaborativeDocumentQueryType } from '../../../collab/mongo-query-mapper/collaborative-document';
import { NoteTextField } from '../../../types.generated';
import { NoteQueryType } from '../../mongo-query-mapper/note';
import { UserNoteDeepQueryResponse } from '../UserNoteDeepQueryResponse';

/**
 * Modifies collabText records pagination result to match
 * the query and stores it in records object as paginationKey.
 * @example
 *
 * // Response structure
 * const responseRecords = {
 *  array: [...records],
 *  sizes: [...]
 * };
 * // Mapped structure
 * const mappedRecords = {
 *  'a:2': [...part records],
 *  'b:5': [...part records],
 * }
 *
 */
export default function userNoteResponseToPaginationsMapped(
  userNote: UserNoteDeepQueryResponse,
  noteQuery: MergedDeepQuery<NoteQueryType> | undefined
): DeepQueryResponsePaginationMapped<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: collabTextResponseToPaginationsMapped(
        userNote.note?.collabText,
        noteQuery?.note?.collabText
      ),
    },
  };
}

export function collabTextResponseToPaginationsMapped(
  collabTextMap: NonNullable<UserNoteDeepQueryResponse['note']>['collabText'],
  collabTextQuery:
    | MergedDeepQuery<Record<NoteTextField, CollaborativeDocumentQueryType>>
    | undefined
): DeepQueryResponsePaginationMapped<
  Record<NoteTextField, CollaborativeDocumentQueryType>
> {
  if (!collabTextQuery || !collabTextMap) {
    return mapObject(NoteTextField, (_key, value) => [value, {}]);
  }

  return mapObject(collabTextQuery, (key, query) => {
    const collabTextMappedPaginations: Required<
      DeepQueryResponsePaginationMapped<Pick<CollaborativeDocumentQueryType, 'records'>>
    > &
      DeepQueryResponsePaginationMapped<CollaborativeDocumentQueryType> = {
      ...collabTextMap[key],
      records: {},
    };

    if (!query?.records?.$paginations) return [key, collabTextMappedPaginations];

    const paginationQueryInput = query.records.$paginations.map(paginationStringToInt);
    const paginationOutput = collabTextMap[key].records;
    if (!paginationOutput) {
      throw new Error('Expected pagination result');
    }

    assertRecordRevisionDefined(paginationOutput);
    const recordsGroupedByInput = mapRevisionRecordsPaginationInputToOutput(
      paginationQueryInput,
      paginationOutput
    );

    for (let i = 0; i < paginationQueryInput.length; i++) {
      const pagination = paginationQueryInput[i];
      if (!pagination) continue;
      const recordsByInput = recordsGroupedByInput[i];
      if (!recordsByInput) continue;

      collabTextMappedPaginations.records[getPaginationKey(pagination)] = recordsByInput;
    }

    return [key, collabTextMappedPaginations];
  });
}
