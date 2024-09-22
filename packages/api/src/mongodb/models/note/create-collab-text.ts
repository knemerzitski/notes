import { Changeset } from '~collab/changeset';
import {
  RevisionRecordSchema,
  SelectionRangeSchema,
  CollabTextSchema,
} from '../../schema/collab-text';
import { SelectionRange } from '~collab/client/selection-range';

interface CreateCollabTextParams {
  creatorUserId: RevisionRecordSchema['creatorUser']['_id'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}

type Records = CollabTextSchema['records'];

/**
 * Create CollabText with inital values
 */
export function createCollabText({
  initialText,
  creatorUserId,
  afterSelection,
}: CreateCollabTextParams): CollabTextSchema & {
  records: [Records[0], ...Records];
} {
  afterSelection = afterSelection
    ? SelectionRange.collapseSame(afterSelection)
    : undefined;

  const changeset = Changeset.fromInsertion(initialText);
  return {
    updatedAt: new Date(),
    headText: {
      revision: 1,
      changeset,
    },
    tailText: {
      revision: 0,
      changeset: Changeset.EMPTY,
    },
    records: [
      {
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
        createdAt: new Date(),
      },
    ],
  };
}
