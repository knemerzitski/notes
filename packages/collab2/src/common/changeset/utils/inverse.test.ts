import { expect, it } from 'vitest';
import { parse as cs } from './parse';
import { inverse } from './inverse';
import { compose } from './compose';

it('overwrites and is smaller', () => {
  const A = cs('0:"between END! Deleted [B]"');
  const B = cs('24:"rewrote everything"');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('overwrites and is larger', () => {
  const A = cs('0:"rewrote everything"');
  const B = cs('18:"between END! Deleted [B]"');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('replace text at start', () => {
  const A = cs('0:"hello world"');
  const B = cs('11:"new",5-10');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('deleted in the middle', () => {
  const A = cs('0:"start between end"');
  const B = cs('17:0-4,13-16');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('start delete, middle replace, end insert', () => {
  const A = cs('0:"start between world"');
  const B = cs('19:"other",13-18," end"');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('multiple strips', () => {
  const A = cs('0:"abcdefghi"');
  const B = cs('9:"x",0,"y",1,3,"z",4-6,"u",7');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('delete start, insert end', () => {
  const A = cs('0:"hello between world"');
  const B = cs('19:6-18," end"');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});

it('delete end', () => {
  const A = cs('0:"START hello between world END"');
  const B = cs('29:0-24');
  const iB = inverse(B, A);
  const AB = compose(A, B);

  expect(compose(AB, iB).toString()).toStrictEqual(A.toString());
});
