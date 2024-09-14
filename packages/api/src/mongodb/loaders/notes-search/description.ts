import { object, string, array, InferRaw } from 'superstruct';
import {
  QueryableNote,
  QueryableNoteContext,
  queryableNoteDescription,
} from '../note/descriptions/note';
import { DeepAnyDescription } from '../../query/description';
import { fieldsRemoved } from '../../query/utils/fields-removed';

export const QueryableSearchNote = object({
  note: QueryableNote,
  cursor: string(),
});

export const QueryableSearchNotes = array(QueryableSearchNote);

export const notesSearchDescription: DeepAnyDescription<
  InferRaw<typeof QueryableSearchNotes>,
  unknown,
  QueryableNoteContext
> = {
  note: fieldsRemoved(queryableNoteDescription, ['$mapLastProject']),
};
