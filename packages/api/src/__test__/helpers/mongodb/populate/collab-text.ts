import { faker } from '@faker-js/faker';

import { Changeset } from '~collab/changeset/changeset';

import { isDefined } from '~utils/type-guards/is-defined';

import {
  DBCollabTextSchema,
  DBRevisionRecordSchema,
} from '../../../../mongodb/schema/collab-text';
import { MongoPartialDeep } from '../../../../mongodb/types';

export interface FakeCollabTextOptions {
  initialText?: string;
  override?: MongoPartialDeep<DBCollabTextSchema>;
  revisionOffset?: number;
  recordsCount?: number;
  record?: (
    recordIndex: number,
    revision: number
  ) => MongoPartialDeep<DBRevisionRecordSchema> | undefined;
}

export function fakeCollabText(
  creatorUserId: DBRevisionRecordSchema['creatorUserId'],
  options?: FakeCollabTextOptions
): DBCollabTextSchema {
  const revisionOffset = Math.max(options?.revisionOffset ?? 0, 0);
  const recordsCount = options?.recordsCount ?? 1;
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

  function fakeRecord(
    options?: MongoPartialDeep<DBRevisionRecordSchema>
  ): DBRevisionRecordSchema {
    return {
      creatorUserId: creatorUserId,
      userGeneratedId: faker.string.nanoid(6),
      revision: headRevision,
      changeset: headChangeset,
      createdAt: new Date(),
      ...options,
      beforeSelection: {
        start: 0,
        ...options?.beforeSelection,
      },
      afterSelection: {
        start: initialText.length,
        ...options?.afterSelection,
      },
    };
  }

  const records =
    options?.override?.records?.filter(isDefined).map(fakeRecord) ??
    [...new Array<undefined>(recordsCount)].map((_, index) => {
      const revision = tailRevision + index + 1;

      return fakeRecord({
        revision: tailRevision + index + 1,
        ...options?.record?.(index, revision),
      });
    });

  return {
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
    records,
  };
}
