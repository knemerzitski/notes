import { CollaborativeDocumentSelectionRangeMapper } from '../schema.mappers';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { SelectionRangeSchema } from '../../../mongodb/schema/collabText/collab-text';

export type SelectionRangeQueryType = SelectionRangeSchema;

export class SelectionRangeQuery implements CollaborativeDocumentSelectionRangeMapper {
  private query: MongoDocumentQuery<SelectionRangeSchema>;

  constructor(query: MongoDocumentQuery<SelectionRangeSchema>) {
    this.query = query;
  }

  async start() {
    return (await this.query.queryDocument({ start: 1 }))?.start;
  }

  async end() {
    return (await this.query.queryDocument({ end: 1 }))?.end;
  }
}
