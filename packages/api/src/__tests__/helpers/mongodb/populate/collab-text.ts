import { faker } from '@faker-js/faker';

import { Changeset, Selection } from '../../../../../../collab/src';

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
  authorId: DBCollabRecordSchema['authorId'],
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
    (options?.override?.headRecord?.revision ?? recordsCount) + revisionOffset;
  const tailRevision = revisionOffset;

  const initialText =
    options?.initialText ??
    faker.word.words({
      count: {
        min: 1,
        max: 10,
      },
    });

  const changeset = Changeset.fromText(initialText);
  const recordChangeset = Changeset.create(
    changeset.outputLength,
    changeset.strips
  ).serialize();

  function createFakeCollabRecord(
    options?: FakeCollabRecordOptions
  ): DBCollabRecordSchema {
    return fakeCollabRecord({
      ...options,
      override: {
        authorId,
        revision: headRevision,
        changeset: recordChangeset,
        inverse: recordChangeset,
        selectionInverse: Selection.ZERO.serialize(),
        selection: Selection.create(initialText.length).serialize(),
        ...options?.override,
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
      headRecord: {
        revision: headRevision,
        text: initialText,
        ...options?.override?.headRecord,
      },
      tailRecord: {
        revision: tailRevision,
        text: initialText,
        ...options?.override?.tailRecord,
      },
    },
    collabRecords,
  };
}
