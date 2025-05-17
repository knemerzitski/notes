import { expect, it } from 'vitest';

import { StripsStruct } from '../struct';

import { compact } from './compact';

function ss(value: string) {
  return StripsStruct.create(value);
}

it('concats two strings', () => {
  expect(compact(ss('"hello"," world"')).toString()).toStrictEqual(
    ss('"hello world"').toString()
  );
});

it('concats continious strips of strings between indices', () => {
  expect(compact(ss('"a","b",10,"c","d","ef"')).toString()).toStrictEqual(
    ss('"ab",10,"cdef"').toString()
  );
});

it('concats continious index, range and string', () => {
  expect(compact(ss('1-3,4,5,"ab","cd",6,7,8-14,"c",11,12')).toString()).toStrictEqual(
    ss('1-5,"abcd",6-14,"c",11-12').toString()
  );
});
