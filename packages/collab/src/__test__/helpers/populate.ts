import { Changeset } from '../../changeset';
import { SelectionRange } from '../../client/selection-range';
import { ServerRevisionRecord } from '../../records/record';

let generatedIdCounter = 0;
function nextFakeGeneratedId() {
  return String(generatedIdCounter++);
}

export function fakeServerRevisionRecord(
  options?: Partial<ServerRevisionRecord>
): ServerRevisionRecord {
  return {
    changeset: Changeset.fromInsertion('fake'),
    creatorUserId: 'fakeUser',
    revision: 0,
    userGeneratedId: nextFakeGeneratedId(),
    ...options,
    beforeSelection: fakeSelectionRange(options?.beforeSelection),
    afterSelection: fakeSelectionRange(options?.afterSelection),
  };
}

export function fakeSelectionRange(options?: Partial<SelectionRange>): SelectionRange {
  return {
    ...options,
    start: 0,
    end: 0,
  };
}
