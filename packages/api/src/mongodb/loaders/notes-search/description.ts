import { object, string, array, InferRaw, Infer } from 'superstruct';
import {
  QueryableNote,
  QueryableNoteContext,
  queryableNoteDescription,
} from '../note/descriptions/note';
import { DescriptionDeep } from '../../query/description';
import { fieldsRemoved } from '../../query/utils/fields-removed';

export const QueryableSearchNote = object({
  note: QueryableNote,
  cursor: string(),
});

export type QueryableSearchNote = Infer<typeof QueryableSearchNote>;

export const QueryableSearchNotes = array(QueryableSearchNote);

export type QueryableSearchNotes = Infer<typeof QueryableSearchNotes>;

export const notesSearchDescription: DescriptionDeep<
  InferRaw<typeof QueryableSearchNotes>,
  unknown,
  QueryableNoteContext
> = {
  note: fieldsRemoved(queryableNoteDescription, ['$mapLastProject']),
};