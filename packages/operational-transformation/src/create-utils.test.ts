import { it, describe, expect } from 'vitest';

import { Changeset } from './changeset';
import { createChangeset, createStrip, createStrips } from './create-utils';
import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

describe('create-utils', () => {
  it('createStrip', () => {
    expect(createStrip()).toStrictEqual(Strip.EMPTY);
    expect(createStrip(-1)).toStrictEqual(Strip.EMPTY);
    expect(createStrip(3)).toStrictEqual(new RetainStrip(3, 3));

    expect(createStrip(5, 4)).toStrictEqual(Strip.EMPTY);
    expect(createStrip(-4, 3)).toStrictEqual(new RetainStrip(0, 3));
    expect(createStrip([-4, 3])).toStrictEqual(new RetainStrip(0, 3));
    expect(createStrip(5, 10)).toStrictEqual(new RetainStrip(5, 10));
    expect(createStrip([5, 10])).toStrictEqual(new RetainStrip(5, 10));

    expect(createStrip('')).toStrictEqual(Strip.EMPTY);
    expect(createStrip('abc')).toStrictEqual(new InsertStrip('abc'));
    expect(createStrip('abcd')).toStrictEqual(new InsertStrip('abcd'));
  });

  it('createStrips', () => {
    expect(createStrips()).toStrictEqual(Strips.EMPTY);
    expect(createStrips([1, 'abc'])).toStrictEqual(
      new Strips([new RetainStrip(1, 1), new InsertStrip('abc')])
    );
  });

  it('createChangeset', () => {
    expect(createChangeset()).toStrictEqual(Changeset.EMPTY);
    expect(createChangeset([1, 'abc'])).toStrictEqual(
      new Changeset(new Strips([new RetainStrip(1, 1), new InsertStrip('abc')]))
    );
  });
});
