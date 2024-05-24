import { Changeset } from '../changeset/changeset';
import { SelectionRange } from '../client/selection-range';
import { RevisionRecord, SubmittedRevisionRecord } from './record';
import {
  RevisionRecords,
  RevisionRecordsEvents,
  RevisionRecordsOptions,
} from './revision-records';

export function newServerRecords<
  TRecord extends ServerRecord,
  TInsertRecord extends ServerInsertRecord & TRecord,
>(
  options?: RevisionRecordsOptions<TRecord, TInsertRecord>
): RevisionRecords<TRecord, TInsertRecord> {
  const server = new RevisionRecords<TRecord, TInsertRecord>(options);
  listenOnProcessNewRecord(server);
  return server;
}

export function listenOnProcessNewRecord<
  TRecord extends ServerRecord,
  TInsertRecord extends ServerInsertRecord & TRecord,
>(revisionRecords: RevisionRecords<TRecord, TInsertRecord>) {
  return revisionRecords.eventBus.on('processNewRecord', (e) => {
    isDuplicateRecordByUserGeneratedId(e);
    if (e.isDuplicate) return;
    followChangeset(e);
  });
}

export type ServerRecord<T = Changeset> = IsExistingRecordByUserGeneratedIdRecord<T> &
  RevisionRecord<T>;
export type ServerInsertRecord<T = Changeset> = FollowChangesetRecord<T> &
  ServerRecord<T>;

type IsExistingRecordByUserGeneratedIdRecord<T = Changeset> = Pick<
  SubmittedRevisionRecord<T>,
  'userGeneratedId'
>;

export function isDuplicateRecordByUserGeneratedId<
  TRecord extends IsExistingRecordByUserGeneratedIdRecord,
  TInsertRecord extends IsExistingRecordByUserGeneratedIdRecord,
>(event: RevisionRecordsEvents<TRecord, TInsertRecord>['processNewRecord']) {
  event.isDuplicate =
    event.isDuplicate ||
    event.newRecord.userGeneratedId === event.existingRecord.userGeneratedId;
}

type FollowChangesetRecord<T = Changeset> = Pick<
  SubmittedRevisionRecord<T>,
  'beforeSelection' | 'afterSelection' | 'changeset'
>;

export function followChangeset<
  TRecord extends RevisionRecord,
  TInsertRecord extends FollowChangesetRecord,
>({
  newRecord,
  existingRecord,
}: RevisionRecordsEvents<TRecord, TInsertRecord>['processNewRecord']) {
  newRecord.beforeSelection = SelectionRange.closestRetainedPosition(
    newRecord.beforeSelection,
    existingRecord.changeset
  );
  newRecord.afterSelection = SelectionRange.closestRetainedPosition(
    newRecord.afterSelection,
    newRecord.changeset.follow(existingRecord.changeset)
  );

  newRecord.changeset = existingRecord.changeset.follow(newRecord.changeset);
}
