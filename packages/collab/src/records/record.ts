import { assign, Infer, number, object, string } from 'superstruct';
import { SelectionRangeStruct } from '../client/selection-range';
import { ChangesetStruct } from '../changeset';

const RevisionStruct = object({
  revision: number(),
});

export type Revision = Infer<typeof RevisionStruct>;

export const RevisionChangesetStruct = assign(
  RevisionStruct,
  object({
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
