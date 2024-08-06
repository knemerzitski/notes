import { MongoQuery } from '../../../mongodb/query/query';
import { CollabTextSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { CollabTextQueryMapper } from '../../collab/mongo-query-mapper/collab-text';
import { ResolverTypeWrapper } from '../../types.generated';

interface Parent {
  id(): ResolverTypeWrapper<string>;
}

export class NoteCollabTextQueryMapper extends CollabTextQueryMapper {
  private parent: Parent;
  private fieldName: string;

  constructor(
    parent: Parent,
    fieldName: string,
    collabText: MongoQuery<CollabTextSchema>
  ) {
    super(collabText);

    this.parent = parent;
    this.fieldName = fieldName;
  }

  override async id() {
    const noteId = await this.parent.id();

    if (!noteId) return null;

    return `${noteId}:${this.fieldName}`;
  }
}
