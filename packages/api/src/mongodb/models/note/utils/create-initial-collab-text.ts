import { ObjectId } from 'mongodb';

import { Changeset, createServerState, Selection } from '../../../../../../collab2/src';

import { CollabRecordSchema, SelectionRangeSchema } from '../../../schema/collab-record';
import { CollabTextSchema } from '../../../schema/collab-text';

import { createCollabRecord } from './create-collab-record';

/**
 * Create CollabText with inital values
 */
export function createInitialCollabText({
  collabTextId,
  initialText,
  authorId,
  afterSelection,
}: {
  collabTextId: ObjectId;
  authorId: CollabRecordSchema['authorId'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}): {
  collabText: CollabTextSchema;
  collabRecords: CollabRecordSchema[];
} {
  const serverState = createServerState([
    {
      authorId: '',
      changeset: Changeset.fromText(initialText),
      idempotencyId: '',
      revision: 1,
      selectionInverse: Selection.ZERO,
      selection: afterSelection ?? Selection.create(initialText.length),
    },
  ]);

  const collabRecords: CollabRecordSchema[] = serverState.records.map((record) =>
    createCollabRecord({
      collabTextId,
      authorId,
      userGeneratedId: record.idempotencyId,
      revision: record.revision,
      changeset: record.changeset,
      inverse: record.inverse,
      beforeSelection: record.selectionInverse,
      afterSelection: record.selection,
    })
  );

  return {
    collabText: {
      updatedAt: new Date(),
      headText: {
        revision: serverState.headRecord.revision,
        changeset: serverState.headRecord.text,
      },
      tailText: {
        revision: serverState.tailRecord.revision,
        changeset: serverState.tailRecord.text,
      },
    },
    collabRecords,
  };
}
