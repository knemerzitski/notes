import { MongoQuery } from '../../../mongodb/query/query';
import { CollabTextSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { CollabTextQueryMapper } from '../../collab/mongo-query-mapper/collab-text';
import { NoteMapper } from '../schema.mappers';

export class NoteCollabTextQueryMapper extends CollabTextQueryMapper {
  private note: Pick<NoteMapper, 'noteIdStr'>;
  private fieldName: string;

  constructor(
    note: Pick<NoteMapper, 'noteIdStr'>,
    fieldName: string,
    collabText: MongoQuery<CollabTextSchema>
  ) {
    super(collabText);

    this.note = note;
    this.fieldName = fieldName;
  }

  override async id() {
    const noteId = await this.note.noteIdStr();

    if (!noteId) return null;

    return `${noteId}:${this.fieldName}`;
  }
}
