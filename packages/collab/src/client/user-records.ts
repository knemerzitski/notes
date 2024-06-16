import { RevisionChangeset } from '../records/record';

import { EditorRevisionRecord } from './collab-editor';

/**
 * Simple facade for querying server records.
 */
export interface ServerRecordsFacade<TRecord> {
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
}

interface UserRecordsParams {
  serverRecords: ServerRecordsFacade<EditorRevisionRecord>;
  userId?: string;
}

export class UserRecords {
  private serverRecords: ServerRecordsFacade<EditorRevisionRecord>;
  private userId?: string;

  constructor(params: UserRecordsParams) {
    this.serverRecords = params.serverRecords;
    this.userId = params.userId;
  }

  getTextAt(revision: number) {
    return this.serverRecords.getTextAt(revision);
  }

  isOwnRecord(record: EditorRevisionRecord) {
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
    records: EditorRevisionRecord[];
    ownCount: number;
  } {
    const records: EditorRevisionRecord[] = [];
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

export function isOwnRecord(record: EditorRevisionRecord, userId?: string | symbol) {
  return !userId || !record.creatorUserId || record.creatorUserId === userId;
}

