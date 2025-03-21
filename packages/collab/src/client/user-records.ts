import mitt, { Emitter } from 'mitt';

import { RevisionChangeset } from '../records/record';

import { CollabServiceRecord } from './collab-service';

export interface ServerRecordsFacadeEvents<TRecord> {
  recordsUpdated: {
    source: ServerRecordsFacade<TRecord>;
  };
}

/**
 * Simple facade for querying server records.
 */
export interface ServerRecordsFacade<TRecord> {
  readonly eventBus: Pick<Emitter<ServerRecordsFacadeEvents<TRecord>>, 'on' | 'off'>;
  /**
   * tailText is a composition of all previous records before oldest record.
   */
  readonly tailText: Readonly<RevisionChangeset>;

  /**
   * Iterates through records from newest (headRevision) to oldest
   */
  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>>;

  /**
   * Get text at specific revision
   */
  getTextAt(revision: number): Readonly<RevisionChangeset>;

  /**
   * @returns true if server has more records
   */
  hasMoreRecords(): boolean;
}

export interface UserRecordsEvents {
  recordsUpdated: {
    source: UserRecords;
  };
}

export class UserRecords {
  private readonly _eventBus: Emitter<UserRecordsEvents> = mitt();
  get eventBus(): Pick<Emitter<UserRecordsEvents>, 'on' | 'off'> {
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
