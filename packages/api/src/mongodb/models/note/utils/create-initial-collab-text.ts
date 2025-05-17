import { ObjectId } from 'mongodb';

import { Changeset, createServerState, Selection } from '../../../../../../collab2/src';

import { CollabRecordSchema, SelectionSchema } from '../../../schema/collab-record';
import { CollabTextSchema } from '../../../schema/collab-text';

import { createCollabRecord } from './create-collab-record';

/**
 * Create CollabText with inital values
 */
export function createInitialCollabText({
  collabTextId,
  initialText,
  authorId,
  selection,
}: {
  collabTextId: ObjectId;
  authorId: CollabRecordSchema['authorId'];
  initialText: string;
  selection?: SelectionSchema;
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
      selection: selection ?? Selection.create(initialText.length),
    },
  ]);

  const collabRecords: CollabRecordSchema[] = serverState.records.map((record) =>
    createCollabRecord({
      collabTextId,
      authorId,
      idempotencyId: record.idempotencyId,
      revision: record.revision,
      changeset: record.changeset,
      inverse: record.inverse,
      selectionInverse: record.selectionInverse,
      selection: record.selection,
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
