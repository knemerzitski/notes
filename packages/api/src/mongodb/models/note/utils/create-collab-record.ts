import { ObjectId } from 'mongodb';

import { CollabRecordSchema } from '../../../schema/collab-record';

export function createCollabRecord(
  partialCollabRecord: Omit<CollabRecordSchema, '_id' | 'createdAt'>
): CollabRecordSchema {
  return {
    ...partialCollabRecord,
    _id: new ObjectId(),
    createdAt: new Date(),
  };
}
