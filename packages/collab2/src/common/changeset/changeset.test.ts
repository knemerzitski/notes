import { describe, expect, it } from 'vitest';

import { StripsStruct, StripStruct } from './struct';
import { parse as cs } from './utils/parse';

function ss(value: string) {
  return StripsStruct.create(value);
}

function s(value: string) {
  return StripStruct.create(value);
}

it('sliceRetained', () => {
  expect(cs('0:').sliceRetained(0, 0).toString()).toStrictEqual(ss('').toString());
  expect(cs('5:2,"a",4').sliceRetained(2, 2).toString()).toStrictEqual(ss('').toString());
  expect(cs('5:1-2,"a",4').sliceRetained(2, 5).toString()).toStrictEqual(
    ss('2,"a",4').toString()
  );
  expect(cs('5:1-2,"a",4').sliceRetained(2, 4).toString()).toStrictEqual(
    ss('2,"a"').toString()
  );
  expect(cs('5:1-2,"a",4').sliceRetained(2, 3).toString()).toStrictEqual(
    ss('2').toString()
  );
  expect(cs('15:"a",2-5,"bc",8-14').sliceRetained(4, 9).toString()).toStrictEqual(
    ss('4-5,"bc",8').toString()
  );
  expect(cs('15:"a",2-5,"bcs",8-14').sliceRetained(4, 9).toString()).toStrictEqual(
    ss('4-5,"bcs",8').toString()
  );
  expect(
    cs('21:"a",2-5,"bc",9-10,"s",14-20').sliceRetained(4, 15).toString()
  ).toStrictEqual(ss('4-5,"bc",9-10,"s",14').toString());
  expect(
    cs('21:"a",2-5,"bc",9-10,"s",14-20').sliceRetained(16, 25).toString()
  ).toStrictEqual(ss('16-20').toString());
});

describe('sliceText', () => {
  it('empty', () => {
    expect(cs('').sliceText(0, 0).toString()).toStrictEqual(ss('').toString());
  });

  it('returns start of single string', () => {
    expect(cs('0:"abcdef"').sliceText(0, 2).toString()).toStrictEqual(
      ss('"ab"').toString()
    );
  });

  it('returns middle of single string', () => {
    expect(cs('0:"abcdef"').sliceText(1, 4).toString()).toStrictEqual(
      ss('"bcd"').toString()
    );
  });

  it('returns middle of single string', () => {
    expect(cs('0:"abcdef"').sliceText(4, 6).toString()).toStrictEqual(
      ss('"ef"').toString()
    );
  });

  it('returns from start if end is undefined', () => {
    expect(cs('0:"abcdef"').sliceText(3).toString()).toStrictEqual(
      ss('"def"').toString()
    );
  });

  it('returns empty for out of bounds index', () => {
    expect(cs('0:"abcde"').sliceText(15, 20).toString()).toStrictEqual(ss('').toString());
  });

  it('returns last three characters from negative index', () => {
    expect(cs('0:"abcde"').sliceText(-3, -1).toString()).toStrictEqual(
      ss('"cde"').toString()
    );
  });

  it('returns empty when start and end are equal', () => {
    expect(cs('0:"abcde"').sliceText(3, 3).toString()).toStrictEqual(ss('').toString());
  });

  it('returns start part of retained', () => {
    expect(cs('6:"ab",3-5,"cd"').sliceText(1, 4).toString()).toStrictEqual(
      ss('"b",3-4').toString()
    );
  });

  it('returns end part of retained', () => {
    expect(cs('6:"ab",3-5,"cd"').sliceText(3, 6).toString()).toStrictEqual(
      ss('4-5,"c"').toString()
    );
  });

  it('returns end part of retained', () => {
    expect(cs('6:"ab",3-5,"cd"').sliceText(3, 6).toString()).toStrictEqual(
      ss('4-5,"c"').toString()
    );
  });
});

it('atText', () => {
  expect(cs('0:"abcdef"').atText(4)?.toString()).toStrictEqual(s('"e"').toString());
  expect(cs('6:"abcd",3-5,"ef"').atText(5)?.toString()).toStrictEqual(s('4').toString());
  expect(cs('0:"abcd"').atText(1000)).toBeUndefined();
});

it('isEqual', () => {
  expect(cs('3:"abc",1-2').isEqual(cs('3:"abc",1-2'))).toBeTruthy();
  expect(cs('6:1,"c",3-5,"bs","ll"').isEqual(cs('6:1,"c",3-5,"bs","ll"'))).toBeTruthy();
  expect(cs('3:"abc",1-2').isEqual(cs('3:1-2,"abc"'))).toBeFalsy();
  expect(cs('3:"abc",1-2').isEqual(cs('3:1-2,"abcd"'))).toBeFalsy();
  expect(cs('3:"abc",1-2').isEqual(cs('4:1-3,"abc"'))).toBeFalsy();
});

it('isIdentity', () => {
  expect(cs('0:').isIdentity()).toBeTruthy();
  expect(cs('1:0').isIdentity()).toBeTruthy();
  expect(cs('5:0-4').isIdentity()).toBeTruthy();

  expect(cs('2:0').isIdentity()).toBeFalsy();
  expect(cs('0:"a"').isIdentity()).toBeFalsy();
  expect(cs('3:"a",0-2').isIdentity()).toBeFalsy();
  expect(cs('3:"a",0,2').isIdentity()).toBeFalsy();
});
