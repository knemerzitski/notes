import { describe, it, expect, beforeAll } from 'vitest';
import { parse as cs } from './parse';
import { followPosition } from './follow-position';
import { Changeset } from '..';

describe('insert start +++*********', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:"+++",0-8');
  });

  it('|***** ****  => +++|***** ****', () => {
    expect(followPosition(0, changeset, false)).toStrictEqual(3);
  });

  it(' *****|****  => +++ *****|****', () => {
    expect(followPosition(5, changeset, true)).toStrictEqual(8);
  });

  it(' ***** ****| => +++ ***** ****|', () => {
    expect(followPosition(9, changeset, true)).toStrictEqual(12);
  });
});

describe('insert middle ****+++*****', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:0-4,"+++",5-8');
  });

  it('|***** ****  => |***** +++ ****', () => {
    expect(followPosition(0, changeset, true)).toStrictEqual(0);
  });

  it(' *****|****  =>  *****|+++ ****', () => {
    expect(followPosition(5, changeset, true)).toStrictEqual(5);
  });

  it(' ******|***  =>  ***** +++*|***', () => {
    expect(followPosition(6, changeset, true)).toStrictEqual(9);
  });

  it(' ***** ****| =>  ***** +++ ****|', () => {
    expect(followPosition(9, changeset, true)).toStrictEqual(12);
  });
});

describe('insert end, *********+++', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:0-8,"+++"');
  });

  it('|***** ****  => |***** **** +++', () => {
    expect(followPosition(0, changeset, true)).toStrictEqual(0);
  });

  it(' *****|****  =>  *****|**** +++', () => {
    expect(followPosition(5, changeset, true)).toStrictEqual(5);
  });

  it(' ***** ****| =>  ***** ****|+++', () => {
    expect(followPosition(9, changeset, true)).toStrictEqual(9);
  });
});

describe('insert start, delete start +++----*****', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:"+++",4-8');
  });

  it('|** *** ****  => +++----|* ****', () => {
    expect(followPosition(0, changeset, false)).toStrictEqual(3);
  });

  it(' **|*** ****  => +++----|* ****', () => {
    expect(followPosition(2, changeset, false)).toStrictEqual(3);
  });

  it(' ** ***|****  => +++---- *|****', () => {
    expect(followPosition(5, changeset, true)).toStrictEqual(4);
  });

  it(' ** *** ****| => +++---- * ****|', () => {
    expect(followPosition(9, changeset, true)).toStrictEqual(8);
  });
});

describe('insert middle, delete middle **--+++--***', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:0-1,"+++",6-8');
  });

  it('|** *** ****  => |**-- +++-- ***', () => {
    expect(followPosition(0, changeset, true)).toStrictEqual(0);
  });

  it(' **|*** ****  =>  **--|+++-- ***', () => {
    expect(followPosition(2, changeset, true)).toStrictEqual(2);
  });

  it(' ** ***|****  =>  **-- +++--|***', () => {
    expect(followPosition(5, changeset, false)).toStrictEqual(5);
  });

  it(' ** *** ****| =>  **-- +++-- ***|', () => {
    expect(followPosition(9, changeset, true)).toStrictEqual(8);
  });
});

describe('insert end, delete end *****----+++', () => {
  let changeset: Changeset;

  beforeAll(() => {
    changeset = cs('9:0-4,"+++"');
  });

  it('|** *** ****  => |** ***---- +++', () => {
    expect(followPosition(0, changeset, true)).toStrictEqual(0);
  });

  it(' **|*** ****  =>  **|***---- +++', () => {
    expect(followPosition(2, changeset, true)).toStrictEqual(2);
  });

  it(' ** ***|****  =>  ** ***----|+++', () => {
    expect(followPosition(5, changeset, true)).toStrictEqual(5);
  });

  it(' ** *** ****| =>  ** ***---- |+++', () => {
    expect(followPosition(9, changeset, false)).toStrictEqual(8);
  });
});

it('only insertion', () => {
  expect(followPosition(0, cs('0:"abc"'), true)).toStrictEqual(0);
  expect(followPosition(5, cs('0:"abc"'), false)).toStrictEqual(3);
});

it('random', () => {
  expect(followPosition(0, cs(''), true)).toStrictEqual(-1);
  expect(followPosition(6, cs('11:0-2,"hello",6-10'), false)).toStrictEqual(8);
  expect(followPosition(6, cs('11:"hello",6-10'), false)).toStrictEqual(5);
  expect(followPosition(9, cs('11:"abc",2-4,"dddsss",8-10'), true)).toStrictEqual(13);
  expect(followPosition(4, cs('11:"aaaddd",8-10'), false)).toStrictEqual(6);
  expect(followPosition(6, cs('17:0-16,"end"'), true)).toStrictEqual(6);
  expect(followPosition(15, cs('15:"start ",0-14'), true)).toStrictEqual(21);
  expect(followPosition(21, cs('21:0-20,"THREE"'), true)).toStrictEqual(21);
});
