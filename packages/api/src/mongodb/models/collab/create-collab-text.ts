import { InferRaw } from 'superstruct';
import { Changeset } from '~collab/changeset/changeset';
import {
  RevisionRecordSchema,
  SelectionRangeSchema,
  CollabTextSchema,
} from '../../schema/collab-text';
import { SelectionRange } from '~collab/client/selection-range';

interface CreateCollabTextParams {
  creatorUserId: RevisionRecordSchema['creatorUserId'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}

type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;
type Records = DBCollabTextSchema['records'];

/**
 * Create CollabText with inital values
 */
export function createCollabText({
  initialText,
  creatorUserId,
  afterSelection,
}: CreateCollabTextParams): DBCollabTextSchema & {
  records: [Records[0], ...Records];
} {
  afterSelection = afterSelection
    ? SelectionRange.collapseSame(afterSelection)
    : undefined;

  const changeset = Changeset.fromInsertion(initialText).serialize();
  return {
    updatedAt: new Date(),
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
