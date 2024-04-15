import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangesetMapper } from '../schema.mappers';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { RevisionChangesetSchema } from '../../../mongodb/schema/collabText/collab-text';

export type RevisionChangesetQueryType = RevisionChangesetSchema;

export class RevisionChangesetQuery implements RevisionChangesetMapper {
  private query: MongoDocumentQuery<RevisionChangesetQueryType>;

  constructor(query: MongoDocumentQuery<RevisionChangesetQueryType>) {
    this.query = query;
  }

  async revision() {
    return (await this.query.queryDocument({ revision: 1 }))?.revision;
  }

  async changeset() {
    const serializedChangeset = (await this.query.queryDocument({ changeset: 1 }))
      ?.changeset;

    if (serializedChangeset == null) {
      return null;
    }

    const changeset = Changeset.parseValue(serializedChangeset);

    return changeset;
  }
}
