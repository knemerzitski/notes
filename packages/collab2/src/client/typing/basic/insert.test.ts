import { expect, it } from 'vitest';

import { insertionRecord } from './insert';
import { Changeset } from '../../../common/changeset';
import { Selection } from '../../../common/selection';

it('inserts to empty text', () => {
  const record = insertionRecord('first', '', Selection.create(0));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('0:"first"').toString()
  );
  expect(record.selection.start).toStrictEqual(5);
});

it('inserts at start', () => {
  const record = insertionRecord('start', 'preexisting text value', Selection.create(0));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:"start",0-21').toString()
  );
  expect(record.selection.start).toStrictEqual(5);
});

it('inserts between current position', () => {
  const record = insertionRecord(' fill', 'preexisting text value', Selection.create(11));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-10," fill",11-21').toString()
  );
  expect(record.selection.start).toStrictEqual(16);
});

it('inserts at end', () => {
  const record = insertionRecord('end', 'preexisting text value', Selection.create(-1));

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-21,"end"').toString()
  );
  expect(record.selection.start).toStrictEqual(25);
});

it('deletes selected on insert', () => {
  const record = insertionRecord(
    'random',
    'preexisting text value',
    Selection.create(12, 16)
  );

  expect(record.changeset.toString()).toStrictEqual(
    Changeset.parse('22:0-11,"random",16-21').toString()
  );
  expect(record.selection.start).toStrictEqual(18);
});
