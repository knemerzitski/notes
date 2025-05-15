import { Changeset } from '../../common/changeset';
import { INSERT_BIAS } from '../../common/utils/insert-bias';
import { $record } from '../record';
import { HeadRecord, ServerRecord, SubmittedRecord } from '../types';

/**
 * Before headComposable: \
 * A * E0 * E1 \
 * _ * B
 *
 * After headComposable: \
 * A * E0 * E1 * B'
 *
 * SubmittedRecord/B follows pre-existing records and adjusts so it can be composed as new head record
 */
export function submittedHeadComposable(
  submittedRecord: Pick<
    SubmittedRecord,
    'id' | 'authorId' | 'targetRevision' | 'changeset' | 'selectionInverse' | 'selection'
  >,
  headRecord: Pick<HeadRecord, 'text'>,
  records: readonly Pick<
    ServerRecord,
    'changeset' | 'inverse' | 'selectionInverse' | 'selection' | 'revision'
  >[]
): ServerRecord {
  const followStartIndex = $record.composableIndexOf(submittedRecord, records) + 1;

  // Get text at submitted using inverse from headText
  let text = headRecord.text;
  for (let i = records.length - 1; i >= followStartIndex; i--) {
    const record = records[i];
    if (!record) {
      continue;
    }

    text = Changeset.compose(text, record.inverse);
  }

  // Caluclate inverse for submittedRecord
  let followRecord: Pick<
    ServerRecord,
    'changeset' | 'inverse' | 'selectionInverse' | 'selection'
  > = {
    ...submittedRecord,
    inverse: Changeset.inverse(submittedRecord.changeset, text),
  };

  // Submitted follows all other changes
  for (let i = followStartIndex; i < records.length; i++) {
    const record = records[i];
    if (!record) {
      continue;
    }

    text = Changeset.compose(text, record.changeset);
    followRecord = $record.follow(followRecord, record, text, INSERT_BIAS);
  }

  return {
    authorId: submittedRecord.authorId,
    idempotencyId: submittedRecord.id,
    revision: nextRevision(
      records[records.length - 1]?.revision ?? submittedRecord.targetRevision
    ),
    changeset: followRecord.changeset,
    inverse: followRecord.inverse,
    selectionInverse: followRecord.selectionInverse,
    selection: followRecord.selection,
  };
}

function nextRevision(headRevision: number) {
  return headRevision + 1;
}
