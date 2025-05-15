import { describe, expect, it } from 'vitest';
import { parse as cs } from './parse';
import { isNoOp, removeNoOps } from './no-op';
import { compose } from './compose';

describe('isNoOp', () => {
  describe('truthy', () => {
    it('empty', () => {
      const A = cs('');
      const B = cs('');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });

    it('identity 3', () => {
      const A = cs('0:"abc"');
      const B = cs('3:0-2');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });

    it('identity 5', () => {
      const A = cs('0:"abcdef"');
      const B = cs('6:0-5');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });

    it('insert and retain', () => {
      const A = cs('5:"abc",0-4');
      const B = cs('8:0-7');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });

    it('insert same', () => {
      const A = cs('0:"abc"');
      const B = cs('3:"abc"');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });

    it('insert same with retain', () => {
      const A = cs('0:"abc"');
      const B = cs('3:0,"bc"');

      expect(isNoOp(A, B)).toBeTruthy();
      expect(compose(A, B).toString()).toStrictEqual(A.toString());
    });
  });

  describe('falsy', () => {
    it('empty', () => {
      const A = cs('');
      const B = cs('1:0');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('retain', () => {
      const A = cs('2:0-1');
      const B = cs('0:');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('insert', () => {
      const A = cs('0:"a"');
      const B = cs('0:');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('insert and longer retain', () => {
      const A = cs('0:"abc"');
      const B = cs('9:0-8');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('insert and shorter retain', () => {
      const A = cs('0:"abcdef"');
      const B = cs('9:0-3');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('insert with retain', () => {
      const A = cs('5:"abc",0-4');
      const B = cs('9:0-8');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('empty to retain', () => {
      const A = cs('');
      const B = cs('7:3-6');

      expect(isNoOp(A, B)).toBeFalsy();
    });

    it('insert to retain', () => {
      const A = cs('0:"abc"');
      const B = cs('6:"ab",5');

      expect(isNoOp(A, B)).toBeFalsy();
    });
  });
});

describe('removeNoOps', () => {
  it('retains insertion that is deleted', () => {
    const T = cs('0:"[EXTERNAL][e1][EXTERNAL][e2]"');
    const A = cs('28:0-9,"[e0][e1]",14-23,"[e2]"');
    const expected = cs('28:0-9,"[e0][e1]",14-27');

    const A_clean = removeNoOps(A, T.getText());

    expect(A_clean.toString()).toStrictEqual(expected.toString());
    expect(compose(T, A_clean).toString()).toStrictEqual(compose(T, A).toString());
  });
});
