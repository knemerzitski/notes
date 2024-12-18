import { describe, expect, it } from 'vitest';
import { spaceNewlineMapper } from './space-newline-mapper';

describe('mapper is symmetrical', () => {
  it.each([
    ['', ''],
    ['foo', 'foo'],
    ['foo  bar', 'foo  bar'],
    ['\n', '\n '],
    ['foo\nbar', 'foo\n bar'],
    ['foo\n bar', 'foo\n  bar'],
    ['foo\n\n\nbar', 'foo\n \n \n bar'],
  ])('%o <=> %o', (pre, post) => {
    expect(spaceNewlineMapper.preStringify(pre)).toStrictEqual(post);
    expect(spaceNewlineMapper.postParse(post)).toStrictEqual(pre);
    expect(
      spaceNewlineMapper.preStringify(spaceNewlineMapper.postParse(post))
    ).toStrictEqual(post);
    expect(
      spaceNewlineMapper.postParse(spaceNewlineMapper.preStringify(pre))
    ).toStrictEqual(pre);
  });
});
