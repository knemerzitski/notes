import mapObject, { mapObjectSkip } from 'map-obj';

import { getPaginationKey } from '../../../../mongodb/operations/pagination/relayArrayPagination';
import {
  DeepQueryResponsePaginationMapped,
  DeepQuery,
  DeepQueryResponse,
} from '../../../../mongodb/query-builder';
import { NoteQuery } from '../../mongo-query-mapper/note';

import { PAGINALTION_BYPASS_SYMBOL } from './userNoteResponseToPaginationsMapped';

/**
 * Creates a UserNote with correct records pagination set.
 */
export default function userNoteQueryPaginationMappedToResponse(
  userNote: DeepQueryResponsePaginationMapped<NoteQuery>,
  userNoteQuery: DeepQuery<NoteQuery>
): DeepQueryResponse<NoteQuery> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabTexts: userNoteQuery.note?.collabTexts
        ? mapObject(userNoteQuery.note.collabTexts, (collabKey, query) => {
            if (!query) return mapObjectSkip;

            const collabText = userNote.note?.collabTexts?.[collabKey];

            if (!query.records?.$pagination) {
              return [collabKey, { ...collabText, records: [] }];
            }

            const paginationKey = getPaginationKey(query.records.$pagination);
            const records = collabText?.records?.[paginationKey] ?? [];
            return [collabKey, { ...collabText, records }];
          })
        : undefined,
    },
    shareNoteLinks: userNote.shareNoteLinks?.[PAGINALTION_BYPASS_SYMBOL],
  };
}
