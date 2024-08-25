import { Changeset } from '~collab/changeset/changeset';
import {
  RevisionRecordSchema,
  SelectionRangeSchema,
  CollabTextSchema,
} from '../../mongodb/schema/collab-text/collab-text';

interface CreateCollabTextParams {
  creatorUserId: RevisionRecordSchema['creatorUserId'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}

/**
 * Create CollabText with inital values
 */
export function createCollabText({
  initialText,
  creatorUserId,
  afterSelection,
}: CreateCollabTextParams): CollabTextSchema & {
  records: [RevisionRecordSchema, ...RevisionRecordSchema[]];
} {
  const changeset = Changeset.fromInsertion(initialText).serialize();
  return {
    headText: {
      revision: 1,
      changeset,
    },
    tailText: {
      revision: 0,
      changeset: Changeset.EMPTY.serialize(),
    },
    records: [
      {
        creatorUserId,
        userGeneratedId: '',
        revision: 1,
        changeset,
        beforeSelection: {
          start: 0,
        },
        afterSelection: afterSelection ?? {
          start: initialText.length,
        },
        createdAt: new Date(),
      },
    ],
  };
}
