import { Changeset } from '~collab/changeset/changeset';

import { MongoQuery } from '../../../mongodb/query/query';
import { RevisionChangesetSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { RevisionChangesetMapper } from '../schema.mappers';

export class RevisionChangesetQueryMapper implements RevisionChangesetMapper {
  private revisionChangeset: MongoQuery<RevisionChangesetSchema>;

  constructor(revisionChangeset: MongoQuery<RevisionChangesetSchema>) {
    this.revisionChangeset = revisionChangeset;
  }

  async revision() {
    return (await this.revisionChangeset.query({ revision: 1 }))?.revision;
  }

  async changeset() {
    const serializedChangeset = (await this.revisionChangeset.query({ changeset: 1 }))
      ?.changeset;

    if (serializedChangeset == null) {
      return null;
    }

    const changeset = Changeset.parseValue(serializedChangeset);

    return changeset;
  }
}
