import { ObjectId } from 'mongodb';

import {
  Changeset,
  createServerStateFromRecords,
  Selection,
} from '../../../../../../collab/src';

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
  toTail,
}: {
  collabTextId: ObjectId;
  authorId: CollabRecordSchema['authorId'];
  initialText: string;
  selection?: SelectionSchema;
  toTail: boolean;
}): {
  collabText: CollabTextSchema;
  collabRecords: CollabRecordSchema[];
} {
  const serverState = createServerStateFromRecords(
    [
      {
        authorId: '',
        changeset: Changeset.fromText(initialText),
        idempotencyId: '',
        revision: 1,
        selectionInverse: Selection.ZERO,
        selection: selection ?? Selection.create(initialText.length),
      },
    ],
    toTail ? 0 : -1
  );

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
      headRecord: {
        revision: serverState.headRecord.revision,
        text: serverState.headRecord.text.getText(),
      },
      tailRecord: {
        revision: serverState.tailRecord.revision,
        text: serverState.tailRecord.text.getText(),
      },
    },
    collabRecords,
  };
}
