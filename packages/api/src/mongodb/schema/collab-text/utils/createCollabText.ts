import { Changeset } from '~collab/changeset/changeset';

import {
  RevisionRecordSchema,
  CollabTextSchema,
  SelectionRangeSchema,
} from '../collab-text';

interface CreateCollabTextParams {
  creatorUserId: RevisionRecordSchema['creatorUserId'];
  initalText: string;
  afterSelection?: SelectionRangeSchema;
}

/**
 * Creates CollabText with inital values.
 */
export default function createCollabText({
  initalText,
  creatorUserId,
  afterSelection,
}: CreateCollabTextParams): CollabTextSchema & {
  records: [RevisionRecordSchema, ...RevisionRecordSchema[]];
} {
  const changeset = Changeset.fromInsertion(initalText).serialize();
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
          start: initalText.length,
        },
      },
    ],
  };
}
