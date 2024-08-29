import { CollabTextMapper } from '../collab/schema.mappers';
import { NoteMapper } from '../note/schema.mappers';
import { NoteTextField } from '../types.generated';

export type NoteCollabMapper = NoteMapper;

export interface NoteTextFieldEntryMapper {
  readonly key: NoteTextField;
  readonly value: CollabTextMapper;
}
