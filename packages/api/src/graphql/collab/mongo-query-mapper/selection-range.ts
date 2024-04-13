import { CollaborativeDocumentSelectionRangeMapper } from '../schema.mappers';
import {} from '../../../mongoose/models/collab/embedded/revision-changeset';
import { DBSelectionRange } from '../../../mongoose/models/collab/embedded/selection-range';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';

export type SelectionRangeQueryType = DBSelectionRange;

export class SelectionRangeQuery implements CollaborativeDocumentSelectionRangeMapper {
  private query: MongoDocumentQuery<DBSelectionRange>;

  constructor(query: MongoDocumentQuery<DBSelectionRange>) {
    this.query = query;
  }

  async start() {
    return (await this.query.queryDocument({ start: 1 }))?.start;
  }

  async end() {
    return (await this.query.queryDocument({ end: 1 }))?.end;
  }
}
