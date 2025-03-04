import { faker } from '@faker-js/faker';

import { Changeset } from '../../../../../../collab/src/changeset';

import { DBCollabRecordSchema } from '../../../../mongodb/schema/collab-record';
import { DBCollabTextSchema } from '../../../../mongodb/schema/collab-text';
import { MongoPartialDeep } from '../../../../mongodb/types';

import { fakeCollabRecord, FakeCollabRecordOptions } from './collab-record';

export interface FakeCollabTextOptions {
  initialText?: string;
  override?: MongoPartialDeep<DBCollabTextSchema>;
  revisionOffset?: number;
  /**
   * Records count or records itself
   */
  records?: number | MongoPartialDeep<DBCollabRecordSchema>[];
  mapRecord?: (
    record: FakeCollabRecordOptions,
    index: number
  ) => FakeCollabRecordOptions | undefined;
}

export function fakeCollabText(
  creatorUserId: DBCollabRecordSchema['creatorUser']['_id'],
  options?: FakeCollabTextOptions
): { collabText: DBCollabTextSchema; collabRecords: DBCollabRecordSchema[] } {
  const revisionOffset = Math.max(options?.revisionOffset ?? 0, 0);
  const recordsCount =
    options?.records != null
      ? Array.isArray(options.records)
        ? options.records.length
        : options.records
      : 1;
  const headRevision =
    (options?.override?.headText?.revision ?? recordsCount) + revisionOffset;
  const tailRevision = revisionOffset;

  const initialText =
    options?.initialText ??
    faker.word.words({
      count: {
        min: 1,
        max: 10,
      },
    });
  const headChangeset = Changeset.fromInsertion(initialText).serialize();

  function createFakeCollabRecord(
    options?: FakeCollabRecordOptions
  ): DBCollabRecordSchema {
    return fakeCollabRecord({
      ...options,
      override: {
        revision: headRevision,
        changeset: headChangeset,
        ...options?.override,
        creatorUser: {
          ...options?.override?.creatorUser,
          _id: creatorUserId,
        },
        beforeSelection: {
          start: 0,
          ...options?.override?.beforeSelection,
        },
        afterSelection: {
          start: initialText.length,
          ...options?.override?.afterSelection,
        },
      },
    });
  }

  const collabRecords: DBCollabRecordSchema[] = (
    options?.records != null && Array.isArray(options.records)
      ? options.records.map((r) => ({
          override: r,
        }))
      : [...new Array<undefined>(recordsCount)].map((_, index) => ({
          override: {
            revision: tailRevision + index + 1,
          },
        }))
  )
    .map((r, index) => options?.mapRecord?.(r, index) ?? r)
    .map(createFakeCollabRecord);

  return {
    collabText: {
      updatedAt: new Date(),
      ...options?.override,
      headText: {
        revision: headRevision,
        changeset: headChangeset,
        ...options?.override?.headText,
      },
      tailText: {
        revision: tailRevision,
        changeset: Changeset.EMPTY.serialize(),
        ...options?.override?.tailText,
      },
    },
    collabRecords,
  };
}
