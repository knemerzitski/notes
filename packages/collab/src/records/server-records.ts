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
    isDuplicateRecord(e);
    if (e.isDuplicate) return;
    followChangeset(e);
  });
}

export type ServerRecord<T = Changeset> = IsDuplicateRecord<T> & RevisionRecord<T>;
export type ServerInsertRecord<T = Changeset> = FollowChangesetRecord<T> &
  ServerRecord<T>;

type IsDuplicateRecord<T = Changeset, U = unknown> = Pick<
  SubmittedRevisionRecord<T>,
  'userGeneratedId'
> & {
  beforeSelection?: Partial<SelectionRange>;
  afterSelection?: Partial<SelectionRange>;
  changeset?: T;
  creatorUserId?: U;
};

export function isDuplicateRecord<
  TRecord extends IsDuplicateRecord,
  TInsertRecord extends IsDuplicateRecord,
>(event: RevisionRecordsEvents<TRecord, TInsertRecord>['processNewRecord']) {
  if (event.isDuplicate) return;
  const { newRecord, existingRecord } = event;

  // Different generated id
  if (newRecord.userGeneratedId !== existingRecord.userGeneratedId) return;

  // Different user
  if (
    event.newRecord.creatorUserId != null &&
    event.existingRecord.creatorUserId != null &&
    !callIsEqualCallOnObject(
      event.newRecord.creatorUserId,
      event.existingRecord.creatorUserId
    )
  ) {
    return;
  }

  // Different changeset
  if (
    newRecord.changeset &&
    existingRecord.changeset &&
    !newRecord.changeset.isEqual(existingRecord.changeset)
  )
    return;

  // Different selections
  if (
    newRecord.afterSelection &&
    existingRecord.afterSelection &&
    !SelectionRange.isEqual(newRecord.afterSelection, existingRecord.afterSelection)
  )
    return;
  if (
    newRecord.beforeSelection &&
    existingRecord.beforeSelection &&
    !SelectionRange.isEqual(newRecord.beforeSelection, existingRecord.beforeSelection)
  )
    return;

  event.isDuplicate = true;
}

function callIsEqualCallOnObject<T = unknown>(a: T, b: T) {
  if (a == null || b === null || typeof a !== 'object' || typeof b !== 'object')
    return a === b;

  if ('isEqual' in a && typeof a.isEqual === 'function') {
    return Boolean(a.isEqual(b));
  }
  if ('equals' in a && typeof a.equals === 'function') {
    return Boolean(a.equals(b));
  }

  return a === b;
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
