import { Changeset } from '../changeset/changeset';
import { RevisionRecord, SelectionRange, SubmittedRevisionRecord } from './record';
import {
  RevisionRecords,
  RevisionRecordsOptions,
  FilterEvents as RevisionRecordFilterEvents,
} from './revision-records';

export class EditorRevisionRecords<
  TRecord extends EditorRecord,
  TInsertRecord extends EditorInsertRecord & TRecord,
> extends RevisionRecords<TRecord, TInsertRecord> {
  private unsubscribeFromEvents: () => void;

  constructor(options?: RevisionRecordsOptions<TRecord, TInsertRecord>) {
    super(options);

    const subscribedListeners = addEditorFilters(this);

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
>(event: RevisionRecordFilterEvents<TRecord, TInsertRecord>['isExistingRecord']) {
  if (event.isExisting) return event;

  return {
    ...event,
    isExisting: event.newRecord.userGeneratedId === event.existingRecord.userGeneratedId,
  };
}

type FollowSelectionRecord<T = Changeset> = Pick<
  SubmittedRevisionRecord<T>,
  'beforeSelection' | 'afterSelection' | 'changeset'
>;

export function followRecordSelection<
  TRecord extends RevisionRecord,
  TInsertRecord extends FollowSelectionRecord,
>(event: RevisionRecordFilterEvents<TRecord, TInsertRecord>['followRecord']) {
  const { newRecord } = event;
  followSelection(newRecord.changeset, newRecord.beforeSelection);
  followSelection(newRecord.changeset, newRecord.afterSelection);

  return event;
}

function followSelection(changeset: Changeset, selection: SelectionRange) {
  selection.start = changeset.followIndex(selection.start);
  if (selection.end != null) {
    selection.end = changeset.followIndex(selection.end);
  }
}

export function addEditorFilters<
  TRecord extends EditorRecord,
  TInsertRecord extends EditorInsertRecord & TRecord,
>(revisionRecords: RevisionRecords<TRecord, TInsertRecord>) {
  return [
    revisionRecords.filterBus.on('isExistingRecord', isExistingRecordByUserGeneratedId),
    revisionRecords.filterBus.on('followRecord', followRecordSelection),
  ];
}
