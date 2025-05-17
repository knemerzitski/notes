import { Infer } from 'superstruct';

import { QueryableCollabText } from '../../mongodb/loaders/note/descriptions/collab-text';
import { QueryableNote } from '../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn, MongoQueryFn } from '../../mongodb/query/query';
import { objectIdToStr } from '../../mongodb/utils/objectid';

export async function CollabText_id_fromNoteQueryFn(
  query: MongoQueryFn<QueryableNote>
): Promise<string | undefined> {
  return objectIdToStr((await query({ _id: 1 }))?._id);
}

const DEFAULT_COLLAB_TEXT: Infer<typeof QueryableCollabText> = {
  updatedAt: new Date(0),
  headRecord: {
    revision: 0,
    text: '',
  },
  tailRecord: {
    revision: 0,
    text: '',
  },
  records: [],
};

export function mapNoteToCollabTextQueryFn(
  query: MongoQueryFn<QueryableNote>
): MongoQueryFn<QueryableCollabText> {
  return createMapQueryFn(query)<QueryableCollabText>()(
    (query) => ({ collabText: query }),
    (result) => result.collabText ?? DEFAULT_COLLAB_TEXT
  );
}
