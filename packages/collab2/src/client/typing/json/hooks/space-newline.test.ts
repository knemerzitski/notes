import { describe, expect, it } from 'vitest';

import { spaceNewline } from './space-newline';

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
    expect(spaceNewline.preStringify(pre)).toStrictEqual(post);
    expect(spaceNewline.postParse(post)).toStrictEqual(pre);
    expect(spaceNewline.preStringify(spaceNewline.postParse(post))).toStrictEqual(post);
    expect(spaceNewline.postParse(spaceNewline.preStringify(pre))).toStrictEqual(pre);
  });
});
