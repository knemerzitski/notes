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
import { CollabTextQuery } from '../../../collab/mongo-query-mapper/collab-text';
import { NoteTextField } from '../../../types.generated';
import { NoteQuery } from '../../mongo-query-mapper/note';
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
  noteQuery: MergedDeepQuery<NoteQuery> | undefined
): DeepQueryResponsePaginationMapped<NoteQuery> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabTexts: collabTextResponseToPaginationsMapped(
        userNote.note?.collabTexts,
        noteQuery?.note?.collabTexts
      ),
    },
  };
}

export function collabTextResponseToPaginationsMapped(
  collabTextMap: NonNullable<UserNoteDeepQueryResponse['note']>['collabTexts'],
  collabTextQuery:
    | MergedDeepQuery<Record<NoteTextField, CollabTextQuery>>
    | undefined
): DeepQueryResponsePaginationMapped<
  Record<NoteTextField, CollabTextQuery>
> {
  if (!collabTextQuery || !collabTextMap) {
    return mapObject(NoteTextField, (_key, value) => [value, {}]);
  }

  return mapObject(collabTextQuery, (key, query) => {
    const collabTextMappedPaginations: Required<
      DeepQueryResponsePaginationMapped<Pick<CollabTextQuery, 'records'>>
    > &
      DeepQueryResponsePaginationMapped<CollabTextQuery> = {
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
