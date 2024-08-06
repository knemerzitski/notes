import { faker } from '@faker-js/faker';

import { Changeset } from '~collab/changeset/changeset';

import isDefined from '~utils/type-guards/isDefined';

import {
  CollabTextSchema,
  RevisionRecordSchema,
} from '../../../../mongodb/schema/collab-text/collab-text';
import { MongoDeepPartial } from '../../../../mongodb/types';

export interface FakeCollabTextOptions {
  initialText?: string;
  override?: MongoDeepPartial<CollabTextSchema>;
  revisionOffset?: number;
  recordsCount?: number;
  record?: (
    recordIndex: number,
    revision: number
  ) => MongoDeepPartial<RevisionRecordSchema> | undefined;
}

export function fakeCollabText(
  creatorUserId: RevisionRecordSchema['creatorUserId'],
  options?: FakeCollabTextOptions
): CollabTextSchema {
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
    options?: MongoDeepPartial<RevisionRecordSchema>
  ): RevisionRecordSchema {
    return {
      creatorUserId: creatorUserId,
      userGeneratedId: faker.string.nanoid(6),
      revision: headRevision,
      changeset: headChangeset,
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
