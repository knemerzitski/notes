/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert, expect, it } from 'vitest';
import { stringifiedMetadata } from './stringified-metadata';

function expectObjectMetadata(obj: Record<string, string>, inner = false) {
  const text = JSON.stringify(obj);

  const meta = stringifiedMetadata(text);
  for (const key of Object.keys(obj)) {
    assert(meta[key] != null);
    let subText = text.slice(meta[key].start, meta[key].end);
    if (inner) {
      subText = JSON.parse(`"${subText}"`);
    }
    expect(subText).toStrictEqual(obj[key]);
  }
}

it('single key', () => {
  expectObjectMetadata({
    foo: 'bar',
  });
});

it('two keys', () => {
  expectObjectMetadata({
    foo: 'bar',
    hello: 'world',
  });
});

it('includes escaped characters', () => {
  expectObjectMetadata(
    {
      foo: 'bar',
      newLine: 'a\nb',
    },
    true
  );
});
