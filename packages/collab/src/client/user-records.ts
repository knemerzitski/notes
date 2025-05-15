import mitt, { Emitter, ReadEmitter } from 'mitt';

import { ServerRecordsFacade, ServerRecordsFacadeEvents } from '../types';

import { CollabServiceRecord } from './collab-service';

export interface UserRecordsEvents {
  recordsUpdated: {
    source: UserRecords;
  };
  filterNewestRecordIterable: ServerRecordsFacadeEvents<CollabServiceRecord>['filterNewestRecordIterable'];
}

export class UserRecords {
  private readonly _eventBus: Emitter<UserRecordsEvents> = mitt();
  get eventBus(): ReadEmitter<UserRecordsEvents> {
    return this._eventBus;
  }

  private readonly eventsOff: (() => void)[];

  private serverRecords: ServerRecordsFacade<CollabServiceRecord>;
  private userId?: string;

  constructor(params: {
    serverRecords: ServerRecordsFacade<CollabServiceRecord>;
    userId?: string;
  }) {
    this.serverRecords = params.serverRecords;
    this.userId = params.userId;

    this.eventsOff = [];

    this.eventsOff.push(
      this.serverRecords.eventBus.on('recordsUpdated', () => {
        this._eventBus.emit('recordsUpdated', {
          source: this,
        });
      }),
      this.serverRecords.eventBus.on('filterNewestRecordIterable', (filter) => {
        this._eventBus.emit('filterNewestRecordIterable', filter);
      })
    );
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  hasMoreRecords() {
    return this.serverRecords.hasMoreRecords();
  }

  getTextAtMaybe(revision: number) {
    return this.serverRecords.getTextAtMaybe(revision);
  }

  getTextAt(revision: number) {
    return this.serverRecords.getTextAt(revision);
  }

  isOwnRecord(record: CollabServiceRecord) {
    return isOwnRecord(record, this.userId);
  }

  /**
   * Finds if there is any older records from headRevision created by userId.
   */
  hasOwnOlderRecords(headRevision: number, count = 1) {
    if (count <= 0) return true;

    for (const record of this.serverRecords.newestRecordsIterable(headRevision)) {
      if (isOwnRecord(record, this.userId)) {
        count--;
        if (count <= 0) return true;
      }
    }
    return count <= 0;
  }

  /**
   * @returns All older records from headRevision that contains desired own record count.
   * It might contain less records than desired. Check return value ownCount for accurate amount.
   */
  sliceOlderRecordsUntilDesiredOwnCount(
    headRevision: number,
    desiredOwnCount: number
  ): {
    records: CollabServiceRecord[];
    ownCount: number;
  } {
    const records: CollabServiceRecord[] = [];
    let ownCount = 0;
    for (const record of this.serverRecords.newestRecordsIterable(headRevision)) {
      records.push(record);
      if (isOwnRecord(record, this.userId)) {
        ownCount++;
        if (ownCount >= desiredOwnCount) {
          break;
        }
      }
    }
    records.reverse();

    return {
      records,
      ownCount,
    };
  }
}

export function isOwnRecord(record: CollabServiceRecord, userId?: string | symbol) {
  return !userId || !record.creatorUserId || record.creatorUserId === userId;
}
