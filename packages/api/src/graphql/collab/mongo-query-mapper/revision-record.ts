import {
  CollaborativeDocumentMapper,
  CollaborativeDocumentRecordMapper,
  CollaborativeDocumentSelectionRangeMapper,
  RevisionChangesetMapper,
} from '../schema.mappers';
import { DBRevisionRecord } from '../../../mongoose/models/collab/embedded/revision-record';
import { RevisionChangesetQuery } from './revision-changeset';
import { SelectionRangeQueryType, SelectionRangeQuery } from './selection-range';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';
import { DeepReplace } from '~utils/types';

export type RevisionRecordQueryType = Omit<
  DBRevisionRecord,
  'beforeSelection' | 'afterSelection'
> & {
  beforeSelection: SelectionRangeQueryType;
  afterSelection: SelectionRangeQueryType;
};

export type ReplaceRevisionRecord<T> = DeepReplace<
  T,
  DBRevisionRecord,
  RevisionRecordQueryType
>;

export class RevisionRecordQuery implements CollaborativeDocumentRecordMapper {
  private parent: CollaborativeDocumentMapper;
  private query: MongoDocumentQuery<DBRevisionRecord>;

  constructor(
    parent: CollaborativeDocumentMapper,
    query: MongoDocumentQuery<DBRevisionRecord>
  ) {
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

  change(): RevisionChangesetMapper {
    return new RevisionChangesetQuery({
      queryDocument: (change) => {
        return this.query.queryDocument(change);
      },
    });
  }

  beforeSelection(): CollaborativeDocumentSelectionRangeMapper {
    return new SelectionRangeQuery({
      queryDocument: async (selection) => {
        return (
          await this.query.queryDocument({
            beforeSelection: selection,
          })
        )?.beforeSelection;
      },
    });
  }

  afterSelection(): CollaborativeDocumentSelectionRangeMapper {
    return new SelectionRangeQuery({
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
