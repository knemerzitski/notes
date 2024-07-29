import { MongoQuery } from '../../../mongodb/query/query';
import { CollabTextSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { QueryableUserNote } from '../../../mongodb/schema/user-note/query/queryable-user-note';
import { CollabTextQueryMapper } from '../../collab/mongo-query-mapper/collab-text';

export class NoteCollabTextQueryMapper extends CollabTextQueryMapper {
  private userNote: MongoQuery<QueryableUserNote>;
  private fieldName: string;

  constructor(
    userNote: MongoQuery<QueryableUserNote>,
    fieldName: string,
    collabText: MongoQuery<CollabTextSchema>
  ) {
    super(collabText);

    this.userNote = userNote;
    this.fieldName = fieldName;
  }

  override async id() {
    const noteId = (
      await this.userNote.query({
        note: {
          _id: 1,
        },
      })
    )?.note?._id?.toString('base64');

    if (!noteId) return null;

    return `${noteId}:${this.fieldName}`;
  }
}
