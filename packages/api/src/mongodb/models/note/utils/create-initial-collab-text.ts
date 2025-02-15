import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset';

import { SelectionRange } from '~collab/client/selection-range';

import { CollabRecordSchema, SelectionRangeSchema } from '../../../schema/collab-record';
import { CollabTextSchema } from '../../../schema/collab-text';

import { createCollabRecord } from './create-collab-record';

/**
 * Create CollabText with inital values
 */
export function createInitialCollabText({
  collabTextId,
  initialText,
  creatorUserId,
  afterSelection,
}: {
  collabTextId: ObjectId;
  creatorUserId: CollabRecordSchema['creatorUser']['_id'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}): {
  collabText: CollabTextSchema;
  collabRecord: CollabRecordSchema;
} {
  afterSelection = afterSelection
    ? SelectionRange.collapseSame(afterSelection)
    : undefined;

  const changeset = Changeset.fromInsertion(initialText);

  const collabRecord: CollabRecordSchema = createCollabRecord({
    collabTextId,
    creatorUser: {
      _id: creatorUserId,
    },
    userGeneratedId: '',
    revision: 1,
    changeset,
    beforeSelection: {
      start: 0,
    },
    afterSelection: afterSelection ?? {
      start: initialText.length,
    },
  });

  return {
    collabText: {
      updatedAt: new Date(),
      headText: {
        revision: 1,
        changeset,
      },
      tailText: {
        revision: 0,
        changeset: Changeset.EMPTY,
      },
    },
    collabRecord,
  };
}
