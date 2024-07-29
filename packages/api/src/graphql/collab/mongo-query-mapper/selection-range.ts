import { MongoQuery } from '../../../mongodb/query/query';
import { SelectionRangeSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { CollabTextSelectionRangeMapper } from '../schema.mappers';

export class CollabTextSelectionRangeQueryMapper
  implements CollabTextSelectionRangeMapper
{
  private selectionRange: MongoQuery<SelectionRangeSchema>;

  constructor(selectionRange: MongoQuery<SelectionRangeSchema>) {
    this.selectionRange = selectionRange;
  }

  async start() {
    return (await this.selectionRange.query({ start: 1 }))?.start;
  }

  async end() {
    return (await this.selectionRange.query({ end: 1 }))?.end;
  }
}
