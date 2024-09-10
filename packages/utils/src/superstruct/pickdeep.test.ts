import { array, number, object, optional, string } from 'superstruct';
import { expect, it } from 'vitest';
import { pickdeep } from './pickdeep';
import { Primitive } from '../types';

it('picks one value from top level', () => {
  const All = object({
    a: string(),
    b: number(),
  });

  const OnlyA = pickdeep(All)<Primitive>()({
    a: 1,
  });

  expect(
    OnlyA.is({
      a: 'a',
    })
  ).toBeTruthy();
  expect(
    OnlyA.is({
      a: 'a',
      b: 5,
    })
  ).toBeFalsy();
});

it('picks nested object', () => {
  const All = object({
    a: string(),
    nested: object({
      b: number(),
    }),
  });

  const OnlyNested = pickdeep(All)<Primitive>()({
    nested: {
      b: 1,
    },
  });

  expect(
    OnlyNested.is({
      nested: {
        b: 2,
      },
    })
  ).toBeTruthy();
  expect(
    OnlyNested.is({
      a: 's',
      nested: {
        b: 2,
      },
    })
  ).toBeFalsy();
});

it('picks from array', () => {
  const AllArray = array(
    object({
      b: number(),
      c: string(),
    })
  );

  const PickC = pickdeep(AllArray)<Primitive>()({
    c: 1,
  });

  expect(
    PickC.is([
      {
        c: 'a',
      },
    ])
  ).toBeTruthy();
  expect(
    PickC.is([
      {
        b: 2,
      },
    ])
  ).toBeFalsy();
});

it('picks nested object in array', () => {
  const All = object({
    a: string(),
    nested: array(
      object({
        b: number(),
        c: string(),
      })
    ),
  });

  const OnlyNestedC = pickdeep(All)<Primitive>()({
    nested: {
      c: 1,
    },
  });

  expect(
    OnlyNestedC.is({
      nested: [
        {
          c: 'a',
        },
      ],
    })
  ).toBeTruthy();
  expect(
    OnlyNestedC.is({
      nested: [
        {
          b: 2,
        },
      ],
    })
  ).toBeFalsy();
});

it('picks nested object in optional array', () => {
  const All = object({
    a: string(),
    nested: optional(
      array(
        object({
          b: number(),
          c: string(),
        })
      )
    ),
  });

  const OnlyNestedC = pickdeep(All)<Primitive>()({
    nested: {
      c: 1,
    },
  });

  expect(
    OnlyNestedC.is({
      nested: [
        {
          c: 'a',
        },
      ],
    })
  ).toBeTruthy();
  expect(
    OnlyNestedC.is({
      nested: [
        {
          b: 2,
        },
      ],
    })
  ).toBeFalsy();
});

it('keeps struct optional', () => {
  const All = object({
    t: string(),
    nested: optional(
      object({
        a: number(),
      })
    ),
  });

  const OnlyNested = pickdeep(All, {
    convertObjectToType: true,
  })<Primitive>()({
    nested: {
      a: 1,
    },
  });

  OnlyNested.create({});
});
