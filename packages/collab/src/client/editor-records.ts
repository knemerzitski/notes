import { ParseError, Serializable, assertHasProperties } from '~utils/serialize';
import { SerializedChangeset } from '../changeset/changeset';
import { RevisionChangeset, SerializedRevisionChangeset } from '../records/record';
import {
  RevisionTailRecords,
  RevisionTailRecordsOptions,
} from '../records/revision-tail-records';
import { EditorRevisionRecord, EditorServerRecord } from './collab-editor';

export type EditorServerRecordsOptions = RevisionTailRecordsOptions<EditorRevisionRecord>;

export interface SerializedEditorServerRecords {
  tailText: SerializedRevisionChangeset;
  records: EditorRevisionRecord<SerializedChangeset>[];
}

export class EditorServerRecords
  extends RevisionTailRecords<EditorRevisionRecord>
  implements Serializable<SerializedEditorServerRecords>
{
  /**
   * Finds if there is any own records from endRevision (inclusive) until startRevision.
   */
  hasOwnRecords(endRevision: number, userId?: string | symbol) {
    for (let i = this.revisionToIndex(endRevision); i >= 0; i--) {
      const record = this.records[i];
      if (!record) continue;
      if (isOwnRecord(record, userId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @returns All records from endRevision up to startRevision until
   * desired own record count is achieved. It might contain less records
   * than desired. Check return value ownCount for accurate amount.
   */
  sliceRecordsUntilDesiredOwnCount(
    endRevision: number,
    desiredOwnCount: number,
    userId?: string | symbol
  ): {
    records: EditorRevisionRecord[];
    ownCount: number;
  } {
    const records: EditorRevisionRecord[] = [];
    let ownCount = 0;
    for (let i = this.revisionToIndex(endRevision); i >= 0; i--) {
      const record = this.records[i];
      if (!record) continue;
      records.push(record);
      if (isOwnRecord(record, userId)) {
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

  serialize(): SerializedEditorServerRecords {
    return {
      tailText: RevisionChangeset.serialize(this.tailText),
      records: this.records.map((record) => EditorServerRecord.serialize(record)),
    };
  }

  static parseValue(
    value: unknown
  ): Pick<EditorServerRecordsOptions, 'tailText' | 'records'> {
    assertHasProperties(value, ['tailText', 'records']);

    if (!Array.isArray(value.records)) {
      throw new ParseError(
        `Expected 'records' to be an array, found '${String(value.records)}'`
      );
    }

    return {
      tailText: RevisionChangeset.parseValue(value.tailText),
      records: value.records.map((record) => EditorServerRecord.parseValue(record)),
    };
  }
}

export function isOwnRecord(record: EditorRevisionRecord, userId?: string | symbol) {
  return !userId || !record.creatorUserId || record.creatorUserId === userId;
}
