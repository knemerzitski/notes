import { faker } from '@faker-js/faker';

import { Changeset, Selection } from '../../../../../../collab2/src';

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

  const changeset = Changeset.fromText(initialText);
  const textChangeset = changeset.serialize();
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
        revision: headRevision,
        changeset: recordChangeset,
        inverse: recordChangeset,
        ...options?.override,
        authorId,
        beforeSelection: options?.override?.beforeSelection ?? Selection.ZERO.serialize(),
        afterSelection:
          options?.override?.afterSelection ??
          Selection.create(initialText.length).serialize(),
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
        changeset: textChangeset,
        ...options?.override?.headText,
      },
      tailText: {
        revision: tailRevision,
        changeset: textChangeset,
        ...options?.override?.tailText,
      },
    },
    collabRecords,
  };
}
