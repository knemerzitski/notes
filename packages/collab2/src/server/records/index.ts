import { assertIsComposable } from './assert-is-composable';
import { assertRecordsToHead } from './assert-records-to-head';
import { assertSubmittedRevision } from './assert-submitted-revision';
import { assertTailToRecords } from './assert-tail-to-records';
import { findSubmittedDuplicate } from './find-submitted-duplicate';
import { submittedHeadComposable } from './submitted-head-composable';

export const $records = {
  assertIsComposable,
  assertRecordsToHead,
  assertTailToRecords,
  assertSubmittedRevision,
  findSubmittedDuplicate,
  submittedHeadComposable,
};
