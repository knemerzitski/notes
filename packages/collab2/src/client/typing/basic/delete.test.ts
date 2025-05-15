import { expect, it } from 'vitest';

import { deletionRecord } from './delete';
import { Changeset } from '../../../common/changeset';
import { Selection } from '../../../common/selection';

it('deletes text in the middle', () => {
  const record = deletionRecord(5, 'preexisting text value', Selection.create(16));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-10,16-21').toString()
  );
  expect(record.selection.start).toStrictEqual(11);
});

it('deletes nothing if selection is at beginning', () => {
  const record = deletionRecord(3, 'preexisting text value', Selection.create(0));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-21').toString()
  );
  expect(record.selection.start).toStrictEqual(0);
});

it('deletes selection by count 1', () => {
  const record = deletionRecord(1, 'preexisting text value', Selection.create(11, 16));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-10,16-21').toString()
  );
  expect(record.selection.start).toStrictEqual(11);
});

it('deletes selection and rest by count - 1', () => {
  const record = deletionRecord(3, 'preexisting text value', Selection.create(11, 16));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-8,16-21').toString()
  );
  expect(record.selection.start).toStrictEqual(9);
});

it('deletes nothing on count 0', () => {
  const record = deletionRecord(0, 'value', Selection.create(2));

  expect(record.changeset.toString()).toStrictEqual(Changeset.parse('5:0-4').toString());
  expect(record.selection.start).toStrictEqual(2);
});
