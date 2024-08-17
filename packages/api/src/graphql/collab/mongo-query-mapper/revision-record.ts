import { MongoQuery } from '../../../mongodb/query/query';
import { RevisionRecordSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { ResolverTypeWrapper } from '../../types.generated';
import { CollabTextRecordMapper, RevisionChangesetMapper } from '../schema.mappers';

import { CollabTextSelectionRangeQueryMapper } from './selection-range';

interface Parent {
  id(): ResolverTypeWrapper<string>;
}

export class CollabTextRecordQueryMapper implements CollabTextRecordMapper {
  private parent: Parent;
  private revisionRecord: MongoQuery<RevisionRecordSchema>;

  constructor(parent: Parent, revisionRecord: MongoQuery<RevisionRecordSchema>) {
    this.parent = parent;
    this.revisionRecord = revisionRecord;
  }

  private async getRevision() {
    return (await this.revisionRecord.query({ revision: 1 }))?.revision;
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
      await this.revisionRecord.query({ creatorUserId: 1 })
    )?.creatorUserId?.toString('base64');
  }

  change(): RevisionChangesetMapper {
    return {
      query: (query) => this.revisionRecord.query(query),
    };
  }

  beforeSelection() {
    return new CollabTextSelectionRangeQueryMapper({
      query: async (selection) => {
        return (
          await this.revisionRecord.query({
            beforeSelection: selection,
          })
        )?.beforeSelection;
      },
    });
  }

  afterSelection() {
    return new CollabTextSelectionRangeQueryMapper({
      query: async (selection) => {
        return (
          await this.revisionRecord.query({
            afterSelection: selection,
          })
        )?.afterSelection;
      },
    });
  }
}
