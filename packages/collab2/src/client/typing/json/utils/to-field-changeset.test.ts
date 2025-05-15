/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, it } from 'vitest';
import { toFieldChangeset } from './to-field-changeset';
import { Changeset } from '../../../../common/changeset';
import { TextParser } from '../text-parser';
import { stringifiedMetadata } from './stringified-metadata';

it('simple insert at start', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('13:0-7,"A",8-12');
  const expectedChangeset = Changeset.parse('3:"A",0-2');

  const beforeChange = {
    foo: 'bar',
  };
  const afterChange = {
    foo: 'Abar',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"bar"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"Abar"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 12,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('simple insert at end', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('13:0-10,"A",11-12');
  const expectedChangeset = Changeset.parse('3:0-2,"A"');

  const beforeChange = {
    foo: 'bar',
  };
  const afterChange = {
    foo: 'barA',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"bar"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"barA"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 12,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('at start retained has escaped character', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('13:0-11,"r",12');
  const expectedChangeset = Changeset.parse('3:0-2,"r"');

  const beforeChange = {
    foo: '\nba',
  };
  const afterChange = {
    foo: '\nbar',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"\\nba"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"\\nbar"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 13,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('insert quote', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('12:0-8,"\\\\\\"",9-11');
  const expectedChangeset = Changeset.parse('2:0,"\\"",1');

  const beforeChange = {
    foo: 'ab',
  };
  const afterChange = {
    foo: 'a"b',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"ab"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"a\\"b"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 12,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('insert newline', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('12:0-8,"\\\\n",9-11');
  const expectedChangeset = Changeset.parse('2:0,"\\n",1');

  const beforeChange = {
    foo: 'ab',
  };
  const afterChange = {
    foo: 'a\nb',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"ab"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"a\\nb"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 12,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('delete at start', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('13:0-7,9-12');
  const expectedChangeset = Changeset.parse('3:1-2');

  const beforeChange = {
    foo: 'abc',
  };
  const afterChange = {
    foo: 'bc',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"abc"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"bc"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 10,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('delete two characters at start', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('13:0-7,10-12');
  const expectedChangeset = Changeset.parse('3:2');

  const beforeChange = {
    foo: 'abc',
  };
  const afterChange = {
    foo: 'c',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"abc"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"c"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 9,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});

it('delete newline at start', () => {
  const textParser = new TextParser({
    keys: ['foo'],
    fallbackKey: 'foo',
  });

  const changeset = Changeset.parse('16:0-7,10-15');
  const expectedChangeset = Changeset.parse('5:1-4');

  const beforeChange = {
    foo: '\n\nabc',
  };
  const afterChange = {
    foo: '\nabc',
  };

  const prevText = textParser.stringify(beforeChange);
  expect(prevText).toMatchInlineSnapshot(`"{"foo":"\\n\\nabc"}"`);
  const prevFieldValue = beforeChange.foo;
  const prevFieldMetadata = stringifiedMetadata(prevText).foo!;

  const viewText = textParser.stringify(afterChange);
  expect(viewText).toMatchInlineSnapshot(`"{"foo":"\\nabc"}"`);
  const fieldMetadata = stringifiedMetadata(viewText).foo!;
  expect(fieldMetadata).toMatchInlineSnapshot(`
    {
      "end": 13,
      "start": 8,
    }
  `);

  expect(
    toFieldChangeset(
      changeset,
      prevText,
      prevFieldValue,
      prevFieldMetadata,
      fieldMetadata,
      textParser
    ).toString()
  ).toStrictEqual(expectedChangeset.toString());
});
