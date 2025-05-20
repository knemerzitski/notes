import { expect, it } from 'vitest';

import { Changeset } from '../changeset';
import { Selection } from '../selection';

import { followChangesetSelection } from './follow-changeset-selection';

it('other inserts before', () => {
  // Text
  const T = Changeset.fromText('hello .');

  // My change
  const A = Changeset.parse('7:0-6," world"');
  const selectionInverse = Selection.create(7);
  const selection = Selection.create(13);

  // Applied change
  const B = Changeset.parse('7:0-5,"between",6');

  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selectionInverse,
      selection,
    },
    B,
    Changeset.compose(T, B),
    false
  );

  expect(result.changeset.toString()).toStrictEqual(
    Changeset.parse('14:0-13," world"').toString()
  );
  expect(result.inverse.toString()).toStrictEqual(Changeset.parse('20:0-13').toString());
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('14').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('20').toString());
});

it('other inserts after', () => {
  // Text
  const T = Changeset.fromText('hello .');

  // My change
  const A = Changeset.parse('7:0-5,"between",6');
  const selectionInverse = Selection.create(6);
  const selection = Selection.create(13);

  // Applied change
  const B = Changeset.parse('7:0-6," world"');

  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selection,
      selectionInverse,
    },
    B,
    Changeset.compose(T, B),
    false
  );

  expect(result.changeset.toString()).toStrictEqual(
    Changeset.parse('13:0-5,"between",6-12').toString()
  );
  expect(result.inverse.toString()).toStrictEqual(
    Changeset.parse('20:0-5,13-19').toString()
  );
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('6').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('13').toString());
});

it('both insert at the beginning, prefer B insertion first', () => {
  // Text
  const T = Changeset.fromText('b');

  // My change
  const A = Changeset.parse('1:"a",0');
  const selectionInverse = Selection.create(0);
  const selection = Selection.create(1);

  // Applied change
  const B = Changeset.parse('1:"A",0');

  // b  => Ab   => Aab

  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selection,
      selectionInverse,
    },
    B,
    Changeset.compose(T, B),
    false
  );

  expect(result.changeset.toString()).toStrictEqual(
    Changeset.parse('2:0,"a",1').toString()
  );
  expect(result.inverse.toString()).toStrictEqual(Changeset.parse('3:0,2').toString());
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('1').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('2').toString());
});

it('both insert at the beginning, prefer A insertion first', () => {
  // Text
  const T = Changeset.fromText('b');

  // My change
  const A = Changeset.parse('1:"a",0');
  const selectionInverse = Selection.create(0);
  const selection = Selection.create(1);

  // Applied change
  const B = Changeset.parse('1:"A",0');

  // b => ab => aAb

  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selection,
      selectionInverse,
    },
    B,
    Changeset.compose(T, B),
    true
  );

  expect(result.changeset.toString()).toStrictEqual(
    Changeset.parse('2:"a",0-1').toString()
  );
  expect(result.inverse.toString()).toStrictEqual(Changeset.parse('3:1-2').toString());
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('0').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('1').toString());
});

// TODO fix
it.skip('delete and insert near same position', () => {
  // Text
  const T = Changeset.fromText('ab');

  // My change, delete "b"
  const A = Changeset.parse('2:0');
  const selectionInverse = Selection.create(2);
  const selection = Selection.create(1);

  // Applied change, insert "c"
  const B = Changeset.parse('2:0-1,"c"');

  // ab => abc => ac
  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selectionInverse,
      selection,
    },
    B,
    Changeset.compose(T, B),
    false
  );

  expect(result.changeset.toString()).toStrictEqual(Changeset.parse('3:0,2').toString());
  expect(result.inverse.toString()).toStrictEqual(
    Changeset.parse('2:0,"b",1').toString()
  );
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('2').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('1').toString());
});

it('delete while insert', () => {
  // Text
  const T = Changeset.fromText('a');

  const A = Changeset.parse('1:');
  const selectionInverse = Selection.create(1);
  const selection = Selection.create(0);

  const B = Changeset.parse('1:"A",0');

  //  Aa
  const result = followChangesetSelection(
    {
      changeset: A,
      inverse: Changeset.inverse(A, T),
      selectionInverse,
      selection,
    },
    B,
    Changeset.compose(T, B),
    false
  );

  expect(result.changeset.toString()).toStrictEqual(Changeset.parse('2:0').toString());
  expect(result.inverse.toString()).toStrictEqual(Changeset.parse('1:0,"a"').toString());
  expect(result.selectionInverse.toString()).toStrictEqual(
    Selection.parse('2').toString()
  );
  expect(result.selection.toString()).toStrictEqual(Selection.parse('1').toString());
});
