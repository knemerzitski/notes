import { assertHead } from './assert-head';
import { assertIsComposable } from './assert-is-composable';
import { assertTail } from './assert-tail';
import { composableIndexOf } from './composab-index-of';
import { composeHeadRecord } from './compose-head-record';
import { follow } from './follow';
import { isSubmittedDuplicate } from './is-submitted-duplicate';

export const $record = {
  assertIsComposable,
  assertHead,
  assertTail,
  isSubmittedDuplicate,
  composeHeadRecord,
  composableIndexOf,
  follow,
};
