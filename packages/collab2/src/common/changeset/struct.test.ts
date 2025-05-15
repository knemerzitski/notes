import { expect, it } from 'vitest';
import { ChangesetStruct } from './struct';
import { Changeset, InsertStrip, RetainStrip } from '.';

function parse(value: string) {
  return ChangesetStruct.create(value);
}

function serialize(value: Changeset) {
  return ChangesetStruct.createRaw(value);
}

it('empty', () => {
  expect(parse('')).toStrictEqual(Changeset.EMPTY);
  expect(parse('0:')).toStrictEqual(Changeset.EMPTY);
  expect(parse('0:""')).toStrictEqual(Changeset.EMPTY);

  expect(serialize(Changeset.EMPTY)).toStrictEqual('0:');
});

it('insertion', () => {
  const raw = '0:"hello world"';
  const value = parse(raw);
  expect(value).toStrictEqual(Changeset.create(0, InsertStrip.create('hello world')));

  expect(serialize(value)).toStrictEqual(raw);
});

it('retained length 1', () => {
  const raw = '6:5';
  const value = parse(raw);
  expect(value).toStrictEqual(Changeset.create(6, RetainStrip.create(5)));

  expect(serialize(value)).toStrictEqual(raw);
});

it('retained length 4', () => {
  const raw = '8:3-7';
  const value = parse(raw);
  expect(value).toStrictEqual(Changeset.create(8, RetainStrip.create(3, 8)));

  expect(serialize(value)).toStrictEqual(raw);
});

it('mixed', () => {
  const raw = '8:3-6,"ab",7,"c"';
  const value = parse(raw);
  expect(value).toStrictEqual(
    Changeset.create(8, [
      RetainStrip.create(3, 7),
      InsertStrip.create('ab'),
      RetainStrip.create(7),
      InsertStrip.create('c'),
    ])
  );

  expect(serialize(value)).toStrictEqual(raw);
});
