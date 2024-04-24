import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { SelectionRangeSchema } from '../../../mongodb/schema/collab-text';
import { CollabTextSelectionRangeMapper } from '../schema.mappers';

export type CollabTextSelectionRangeQuery = SelectionRangeSchema;

export class CollabTextSelectionRangeQueryMapper
  implements CollabTextSelectionRangeMapper
{
  private query: MongoDocumentQuery<CollabTextSelectionRangeQuery>;

  constructor(query: MongoDocumentQuery<CollabTextSelectionRangeQuery>) {
    this.query = query;
  }

  async start() {
    return (await this.query.queryDocument({ start: 1 }))?.start;
  }

  async end() {
    return (await this.query.queryDocument({ end: 1 }))?.end;
  }
}
