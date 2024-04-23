import { CollabTextMapper, CollabTextRecordMapper } from '../schema.mappers';
import { RevisionChangesetQueryMapper } from './revision-changeset';
import {
  CollabTextSelectionRangeQuery,
  CollabTextSelectionRangeQueryMapper,
} from './selection-range';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { RevisionRecordSchema } from '../../../mongodb/schema/collabText/collab-text';

export type CollabTextRecordQuery = Omit<
  RevisionRecordSchema,
  'beforeSelection' | 'afterSelection'
> & {
  beforeSelection: CollabTextSelectionRangeQuery;
  afterSelection: CollabTextSelectionRangeQuery;
};

type Parent = Pick<CollabTextMapper, 'id'>;

export class CollabTextRecordQueryMapper implements CollabTextRecordMapper {
  private parent: Parent;
  private query: MongoDocumentQuery<RevisionRecordSchema>;

  constructor(parent: Parent, query: MongoDocumentQuery<RevisionRecordSchema>) {
    this.parent = parent;
    this.query = query;
  }

  private async getRevision() {
    return (await this.query.queryDocument({ revision: 1 }))?.revision;
  }

  async id() {
    const [parentId, revision] = await Promise.all([
      this.parent.id(),
      this.getRevision(),
    ]);

    if (parentId == null || revision == null) {
      return null;
    }

    return `${parentId}:${revision}`;
  }

  async creatorUserId() {
    return (
      await this.query.queryDocument({ creatorUserId: 1 })
    )?.creatorUserId?.toString('base64');
  }

  change() {
    return new RevisionChangesetQueryMapper({
      queryDocument: (change) => {
        return this.query.queryDocument(change);
      },
    });
  }

  beforeSelection() {
    return new CollabTextSelectionRangeQueryMapper({
      queryDocument: async (selection) => {
        return (
          await this.query.queryDocument({
            beforeSelection: selection,
          })
        )?.beforeSelection;
      },
    });
  }

  afterSelection() {
    return new CollabTextSelectionRangeQueryMapper({
      queryDocument: async (selection) => {
        return (
          await this.query.queryDocument({
            afterSelection: selection,
          })
        )?.afterSelection;
      },
    });
  }
}
