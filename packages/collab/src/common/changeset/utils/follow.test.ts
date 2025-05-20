import { describe, expect, it } from 'vitest';

import { Changeset } from '..';

import { compose as _compose } from './compose';
import { follow } from './follow';
import { parse as cs } from './parse';

function compose(...changesets: Changeset[]) {
  return changesets.reduce(_compose);
}

it('handles empty', () => {
  const A = cs('');
  const B = cs('');
  const C = cs('');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('deletes retained', () => {
  const A = cs('2:0-1,"c"');
  const B = cs('2:0');
  const C = cs('3:0,2');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('baseball * basil * below = besiow (from easysync)', () => {
  const A = cs('8:0-1,"si",7');
  const B = cs('8:0,"e",6,"ow"');
  const C = cs('5:0,"e",2-3,"ow"');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('baseball * below * basil = besiow (from easysync)', () => {
  const A = cs('8:0,"e",6,"ow"');
  const B = cs('8:0-1,"si",7');
  const C = cs('5:0-1,"si",3-4');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('A insertion to retained', () => {
  const A = cs('0:"hello world"');
  const B = cs('');
  const C = cs('11:0-10');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('A insertion in the middle is offset', () => {
  const A = cs('16:0-4,"hello world",5-8');
  const B = cs('16:');
  const C = cs('20:5-15');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('B insertion stays insertion', () => {
  const A = cs('');
  const B = cs('0:"hello world"');
  const C = cs('0:"hello world"');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('B insertion without offset', () => {
  const A = cs('9:');
  const B = cs('9:0-4,"hello world",5-8');
  const C = cs('0:"hello world"');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('both insert, A middle, B end', () => {
  const A = cs('24:0-10,"between",11-23');
  const B = cs('24:0-23,"end"');
  const C = cs('31:0-30,"end"');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('both insert, A end, B middle', () => {
  const A = cs('24:0-23,"end"');
  const B = cs('24:0-10,"between",11-23');
  const C = cs('27:0-10,"between",11-26');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('both insert in the same position with same value', () => {
  const A = cs('13:0-6,"fast",7-12');
  const B = cs('13:0-6,"fast",7-12');
  const C = cs('17:0-6,"fast",7-16');

  expect(follow(B, A, true).toString()).toStrictEqual(C.toString());
});

it('retains intersection of both retained', () => {
  const A = cs('42:0-41');
  const B = cs('42:33-38');
  const C = cs('42:33-38');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('retains single retain from multiple retains', () => {
  const A = cs('30:0-12,19-29');
  const B = cs('30:0-29');
  const C = cs('24:0-23');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

it('retains insertion in order', () => {
  const A = cs('35:0-11,"best",12-14');
  const B = cs('35:0-11,"fast",12-14');
  const C = cs('19:0-15,"fast",16-18');

  expect(follow(B, A, false).toString()).toStrictEqual(C.toString());
});

describe('follow is commutative', () => {
  it('#1', () => {
    const T = cs('0:"ABCDEFGHIJKLM"');
    const A = cs('13:"ab",0-4,"efg",8-12');
    const B = cs('13:"cd",0-4,"hij",8-12');
    const C = cs('15:0-1,"cd",2-9,"hij",10-14');

    expect(follow(B, A, false).toString()).toStrictEqual(C.toString());

    expect(compose(T, A, follow(B, A, false))).toStrictEqual(
      compose(T, B, follow(A, B, true))
    );
  });

  it('#2', () => {
    const T = cs('0:"ABCDEFGHIJKLM"');
    const A = cs('13:"ab",0-4,"efg",8-12');
    const B = cs('13:"cd",1-5,"hij",8-12');
    const C = cs('15:0-1,"cd",3-9,"hij",10-14');

    expect(follow(B, A, false).toString()).toStrictEqual(C.toString());

    expect(compose(T, A, follow(B, A, false))).toStrictEqual(
      compose(T, B, follow(A, B, true))
    );
  });

  it('#3', () => {
    const T = cs('0:"ABCDEFGHIJKLM"');
    const A = cs('13:"ab",0-4,"efg",8-12');
    const B = cs('13:"cd",2-6,"hij",8-12');
    const C = cs('15:0-1,"cd",4-9,"hij",10-14');

    expect(follow(B, A, false).toString()).toStrictEqual(C.toString());

    expect(compose(T, A, follow(B, A, false))).toStrictEqual(
      compose(T, B, follow(A, B, true))
    );
  });

  it('#4', () => {
    const T = cs('0:"ABCDEFGHIJKLM"');
    const A = cs('13:"ab",0-4,"efg",8-12');
    const B = cs('13:"cd",3-7,"hij",8-12');
    const C = cs('15:0-1,"cd",5-9,"hij",10-14');

    expect(follow(B, A, false).toString()).toStrictEqual(C.toString());

    expect(compose(T, A, follow(B, A, false))).toStrictEqual(
      compose(T, B, follow(A, B, true))
    );
  });
});
