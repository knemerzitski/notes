import { Changeset } from '~collab/changeset/changeset';

import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { RevisionChangesetSchema } from '../../../mongodb/schema/collab-text';
import { RevisionChangesetMapper } from '../schema.mappers';

export type RevisionChangesetQuery = RevisionChangesetSchema;

export class RevisionChangesetQueryMapper implements RevisionChangesetMapper {
  private query: MongoDocumentQuery<RevisionChangesetQuery>;

  constructor(query: MongoDocumentQuery<RevisionChangesetQuery>) {
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
