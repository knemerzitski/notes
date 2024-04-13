import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangesetMapper } from '../schema.mappers';
import { DBRevisionChangeset } from '../../../mongoose/models/collab/embedded/revision-changeset';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';

export type RevisionChangesetQueryType = DBRevisionChangeset;

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
