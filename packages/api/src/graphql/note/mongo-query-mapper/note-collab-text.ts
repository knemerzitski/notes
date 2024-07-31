import { MongoQuery } from '../../../mongodb/query/query';
import { CollabTextSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import { CollabTextQueryMapper } from '../../collab/mongo-query-mapper/collab-text';

export class NoteCollabTextQueryMapper extends CollabTextQueryMapper {
  private note: MongoQuery<QueryableNote>;
  private fieldName: string;

  constructor(
    note: MongoQuery<QueryableNote>,
    fieldName: string,
    collabText: MongoQuery<CollabTextSchema>
  ) {
    super(collabText);

    this.note = note;
    this.fieldName = fieldName;
  }

  override async id() {
    const noteId = (
      await this.note.query({
        _id: 1,
      })
    )?._id?.toString('base64');

    if (!noteId) return null;

    return `${noteId}:${this.fieldName}`;
  }
}
