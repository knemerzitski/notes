import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

import { Changeset, Selection } from '../../../../../../collab2/src';

import { DBCollabRecordSchema } from '../../../../mongodb/schema/collab-record';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { mongoCollections } from '../instance';

import { populateQueue } from './populate-queue';

export interface FakeCollabRecordOptions {
  override?: MongoPartialDeep<DBCollabRecordSchema>;
}

export function fakeCollabRecord(
  options?: FakeCollabRecordOptions
): DBCollabRecordSchema {
  return {
    _id: new ObjectId(),
    authorId: new ObjectId(),
    collabTextId: new ObjectId(),
    userGeneratedId: faker.string.nanoid(6),
    revision: faker.number.int(),
    changeset: Changeset.EMPTY.serialize(),
    inverse: Changeset.EMPTY.serialize(),
    selectionInverse: Selection.ZERO.serialize(),
    afterSelection: Selection.ZERO.serialize(),
    createdAt: new Date(),
    ...options?.override,
  };
}

export const fakeCollabRecordPopulateQueue: typeof fakeCollabRecord = (options) => {
  const collabRecord = fakeCollabRecord(options);

  populateQueue(async () => {
    await mongoCollections.collabRecords.insertOne(collabRecord);
  });

  return collabRecord;
};
