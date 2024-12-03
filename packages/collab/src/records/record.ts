import { assign, Infer, number, object, string, type } from 'superstruct';

import { ChangesetStruct } from '../changeset';
import { SelectionRangeStruct } from '../client/selection-range';

const RevisionStruct = type({
  revision: number(),
});

export type Revision = Infer<typeof RevisionStruct>;

export const RevisionChangesetStruct = assign(
  RevisionStruct,
  type({
    changeset: ChangesetStruct,
  })
);

export type RevisionChangeset = Infer<typeof RevisionChangesetStruct>;

const RevisionRecordStruct = RevisionChangesetStruct;

export type RevisionRecord = Infer<typeof RevisionRecordStruct>;

/**
 * Record submitted by the client
 */
export const SubmittedRevisionRecordStruct = assign(
  RevisionRecordStruct,
  object({
    /**
     * Randomly user generated string when record is created.
     * Used for preventing duplicate submissions.
     */
    userGeneratedId: string(),
    /**
     * Selection before change is composed
     */
    beforeSelection: SelectionRangeStruct,
    /**
     * Selection after change is composed
     */
    afterSelection: SelectionRangeStruct,
  })
);

export type SubmittedRevisionRecord = Infer<typeof SubmittedRevisionRecordStruct>;

/**
 * Record processed by the server
 */
export const ServerRevisionRecordStruct = assign(
  SubmittedRevisionRecordStruct,
  object({
    creatorUserId: string(),
  })
);

export type ServerRevisionRecord = Infer<typeof ServerRevisionRecordStruct>;
