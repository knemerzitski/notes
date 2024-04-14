import mapObject, { mapObjectSkip } from "map-obj";
import { getPaginationKey } from "../../../../mongoose/operations/pagination/relayArrayPagination";
import { DeepQueryResponsePaginationMapped, DeepQuery, DeepQueryResponse } from "../../../../mongoose/query-builder";
import { NoteQueryType } from "../../mongo-query-mapper/note";

/**
 * Creates a UserNote with correct records pagination set.
 */
export default function userNoteQueryPaginationMappedToResponse(
  userNote: DeepQueryResponsePaginationMapped<NoteQueryType>,
  userNoteQuery: DeepQuery<NoteQueryType>
): DeepQueryResponse<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: userNoteQuery.note?.collabText
        ? mapObject(userNoteQuery.note.collabText, (collabKey, query) => {
            if (!query) return mapObjectSkip;

            const collabText = userNote.note?.collabText?.[collabKey];

            if (!query.records?.$pagination) {
              return [collabKey, { ...collabText, records: [] }];
            }

            const paginationKey = getPaginationKey(query.records.$pagination);
            const records = collabText?.records?.[paginationKey] ?? [];
            return [collabKey, { ...collabText, records }];
          })
        : undefined,
    },
  };
}