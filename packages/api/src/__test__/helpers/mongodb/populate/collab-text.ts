import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';

import isDefined from '~utils/type-guards/isDefined';

import { CollectionName } from '../../../../mongodb/collections';
import {
  CollabTextSchema,
  CollabTextUserNoteSchema,
  RevisionRecordSchema,
} from '../../../../mongodb/schema/collab-text';
import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { populateQueue } from './populate-queue';

export interface FakeCollabTextOptions {
  initialText?: string;
  override?: DeepPartial<Omit<CollabTextSchema, 'userNotes'>>;
  revisionOffset?: number;
  recordsCount?: number;
  record?: (recordIndex: number, revision: number) => DeepPartial<RevisionRecordSchema>;
}

export function fakeCollabText(
  userNote: CollabTextUserNoteSchema,
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

  function fakeRecord(options?: DeepPartial<RevisionRecordSchema>): RevisionRecordSchema {
    return {
      creatorUserId: userNote.userId,
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
    _id: new ObjectId(),
    ...options?.override,
    userNotes: [
      {
        id: userNote.id,
        userId: userNote.userId,
      },
    ],
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

export const fakeCollabTextPopulateQueue: typeof fakeCollabText = (userNote, options) => {
  const collabText = fakeCollabText(userNote, options);

  populateQueue(async () => {
    await mongoCollections[CollectionName.COLLAB_TEXTS].insertOne(collabText);
  });

  return collabText;
};
