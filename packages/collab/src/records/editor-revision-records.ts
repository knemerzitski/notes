import { Changeset } from '../changeset/changeset';
import { SelectionRange } from '../client/selection-range';
import { RevisionRecord, SubmittedRevisionRecord } from './record';
import {
  RevisionRecords,
  RevisionRecordsOptions,
  RevisionRecordEvents,
} from './revision-records';

export class EditorRevisionRecords<
  TRecord extends EditorRecord,
  TInsertRecord extends EditorInsertRecord & TRecord,
> extends RevisionRecords<TRecord, TInsertRecord> {
  private unsubscribeFromEvents: () => void;

  constructor(options?: RevisionRecordsOptions<TRecord, TInsertRecord>) {
    super(options);

    const subscribedListeners = subscribeEditorListeners(this);

    this.unsubscribeFromEvents = () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    };
  }
  /**
   * Removes event listeners. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
  }
}

export type EditorRecord<T = Changeset> = IsExistingRecordByUserGeneratedIdRecord<T> &
  RevisionRecord<T>;
export type EditorInsertRecord<T = Changeset> = FollowSelectionRecord<T> &
  EditorRecord<T>;

type IsExistingRecordByUserGeneratedIdRecord<T = Changeset> = Pick<
  SubmittedRevisionRecord<T>,
  'userGeneratedId'
>;

export function isExistingRecordByUserGeneratedId<
  TRecord extends IsExistingRecordByUserGeneratedIdRecord,
  TInsertRecord extends IsExistingRecordByUserGeneratedIdRecord,
>(event: RevisionRecordEvents<TRecord, TInsertRecord>['isExistingRecord']) {
  event.isExisting =
    event.isExisting ||
    event.newRecord.userGeneratedId === event.existingRecord.userGeneratedId;
}

type FollowSelectionRecord<T = Changeset> = Pick<
  SubmittedRevisionRecord<T>,
  'beforeSelection' | 'afterSelection' | 'changeset'
>;

export function followRecordSelection<
  TRecord extends RevisionRecord,
  TInsertRecord extends FollowSelectionRecord,
>({ newRecord }: RevisionRecordEvents<TRecord, TInsertRecord>['followRecord']) {
  newRecord.beforeSelection = SelectionRange.followChangeset(
    newRecord.beforeSelection,
    newRecord.changeset
  );
  newRecord.afterSelection = SelectionRange.followChangeset(
    newRecord.afterSelection,
    newRecord.changeset
  );
}

export function subscribeEditorListeners<
  TRecord extends EditorRecord,
  TInsertRecord extends EditorInsertRecord & TRecord,
>(revisionRecords: RevisionRecords<TRecord, TInsertRecord>) {
  return [
    revisionRecords.eventBus.on('isExistingRecord', isExistingRecordByUserGeneratedId),
    revisionRecords.eventBus.on('followRecord', followRecordSelection),
  ];
}
