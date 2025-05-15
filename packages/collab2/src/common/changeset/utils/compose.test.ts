import { describe, it, expect } from 'vitest';
import { compose } from './compose';
import { parse as cs } from './parse';
import { ChangesetError } from '../error';

it('simple hello world', () => {
  const A = cs('0:"hello"');
  const B = cs('5:0-4," world"');
  const C = cs('0:"hello world"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('overlaps retained characters with insertions', () => {
  const A = cs('7:"s",2-5,"replace",6,"start"');
  const B = cs('18:0-3,"new",5-12," ",13,"ends"');
  const C = cs('7:"s",2-4,"newreplace",6," sends"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('baseball * basil * below', () => {
  const A = cs('8:0-1,"si",7');
  const B = cs('5:0,"e",2-3,"ow"');
  const C = cs('8:0,"esiow"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('baseball * below * basil', () => {
  const A = cs('8:0,"e",6,"ow"');
  const B = cs('5:0-1,"si",3-4');
  const C = cs('8:0,"esiow"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('returns empty on empty', () => {
  const A = cs('');
  const B = cs('');
  const C = cs('');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('returns second when first is empty', () => {
  const A = cs('');
  const B = cs('0:"abc"');
  const C = cs('0:"abc"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('returns insert when composing on insert', () => {
  const A = cs('');
  const B = cs('0:"abc"');
  const C = cs('0:"abc"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('returns empty when composing on empty', () => {
  const A = cs('0:"abc"');
  const B = cs('3:');
  const C = cs('');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('single retained character', () => {
  const A = cs('0:"abc"');
  const B = cs('3:1');
  const C = cs('0:"b"');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('composes retained on retained', () => {
  const A = cs('7:2-6');
  const B = cs('5:2');
  const C = cs('7:4');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('overlap insert and retain', () => {
  const A = cs('7:"abc",0-4');
  const B = cs('8:0-7');
  const C = cs('7:"abc",0-4');

  expect(compose(A, B).toString()).toStrictEqual(C.toString());
});

it('hello between world', () => {
  const changesets = [
    cs('0:"hello"'),
    cs('5:0-4," world"'),
    cs('11:0-5,"between ",6-10'),
  ];
  const expected = cs('0:"hello between world"');

  expect(changesets.reduce(compose).toString()).toStrictEqual(expected.toString());
});

describe('error', () => {
  it('retained character on empty', () => {
    const A = cs('');
    const B = cs('1:0');

    expect(() => compose(A, B)).toThrow(ChangesetError);
  });

  it('retained character out of bounds', () => {
    const A = cs('0:"a"');
    const B = cs('2:1');

    expect(() => compose(A, B)).toThrow(ChangesetError);
  });

  it('retained character out of bounds with insert', () => {
    const A = cs('0:"hello"');
    const B = cs('8:0-7," world"');

    expect(() => compose(A, B)).toThrow(ChangesetError);
  });

  it('retained character out of larger bounds with insert', () => {
    const A = cs('0:"hello"');
    const B = cs('15:12-14," world"');

    expect(() => compose(A, B)).toThrow(ChangesetError);
  });
});
