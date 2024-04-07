import { Changeset } from '../changeset/changeset';
import { FilterEvents, Record } from './revision-records';

interface Selection {
  start: number;
  end?: number;
}

export interface ClientRecord extends Record {
  generatedId: string;
  selection: {
    before: Selection;
    after: Selection;
  };
}

export function followRecordSelection<
  TRecord extends Pick<ClientRecord, 'selection' | 'change'>,
>(event: FilterEvents<TRecord>['followRecord']) {
  const { record, follow } = event;

  followSelection(record.change.changeset, follow.selection.before);
  followSelection(record.change.changeset, follow.selection.after);

  return event;
}

function followSelection(changeset: Changeset, selection: Selection) {
  selection.start = changeset.followIndex(selection.start);
  if (selection.end != null) {
    selection.end = changeset.followIndex(selection.end);
  }
}
