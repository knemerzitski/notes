import { WritableDraft } from 'immer';
import {
  HistoryServiceRecord,
  ServerHistoryServiceRecord,
  ViewHistoryServiceRecord,
} from '../types';

export function getLastHistoryRecord(
  records: WritableDraft<HistoryServiceRecord>[],
  type: ServerHistoryServiceRecord['type'],
  countFromEnd?: number
): WritableDraft<ServerHistoryServiceRecord> | undefined;
export function getLastHistoryRecord(
  records: WritableDraft<HistoryServiceRecord>[],
  type: ViewHistoryServiceRecord['type'],
  countFromEnd?: number
): WritableDraft<ViewHistoryServiceRecord> | undefined;
export function getLastHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ServerHistoryServiceRecord['type'],
  countFromEnd?: number
): ServerHistoryServiceRecord | undefined;
export function getLastHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ViewHistoryServiceRecord['type'],
  countFromEnd?: number
): ViewHistoryServiceRecord | undefined;
export function getLastHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ServerHistoryServiceRecord['type'],
  countFromEnd?: number
): ServerHistoryServiceRecord | undefined;
export function getLastHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: HistoryServiceRecord['type'],
  countFromEnd = 0
): HistoryServiceRecord | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    if (!record) {
      continue;
    }

    if (record.type === type) {
      if (countFromEnd <= 0) {
        return record;
      } else {
        countFromEnd--;
      }
    }
  }

  return;
}

export function getFirstHistoryRecord(
  records: WritableDraft<HistoryServiceRecord>[],
  type: ServerHistoryServiceRecord['type'],
  countFromStart?: number
): WritableDraft<ServerHistoryServiceRecord> | undefined;
export function getFirstHistoryRecord(
  records: WritableDraft<HistoryServiceRecord>[],
  type: ViewHistoryServiceRecord['type'],
  countFromStart?: number
): WritableDraft<ViewHistoryServiceRecord> | undefined;
export function getFirstHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ServerHistoryServiceRecord['type'],
  countFromStart?: number
): ServerHistoryServiceRecord | undefined;
export function getFirstHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ViewHistoryServiceRecord['type'],
  countFromStart?: number
): ViewHistoryServiceRecord | undefined;
export function getFirstHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: ServerHistoryServiceRecord['type'],
  countFromStart?: number
): ServerHistoryServiceRecord | undefined;
export function getFirstHistoryRecord(
  records: readonly HistoryServiceRecord[],
  type: HistoryServiceRecord['type'],
  countFromStart = 0
): HistoryServiceRecord | undefined {
  for (const record of records) {
    if (record.type === type) {
      if (countFromStart <= 0) {
        return record;
      } else {
        countFromStart--;
      }
    }
  }

  return;
}
