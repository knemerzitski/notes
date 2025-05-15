import { expect, it } from 'vitest';
import { parse as cs } from './parse';
import { identity } from './identity';

it('length 0', () => {
  expect(identity(0).toString()).toStrictEqual(cs('').toString());
});

it('length 4', () => {
  expect(identity(4).toString()).toStrictEqual(cs('4:0-3').toString());
});

it('length 12', () => {
  expect(identity(12).toString()).toStrictEqual(cs('12:0-11').toString());
});
