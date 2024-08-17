import { expect, it } from 'vitest';

import { splitObject } from './split-object';

it.each([
  [{}, []],
  [
    {
      title: 1,
    },
    [
      {
        title: 1,
      },
    ],
  ],
  [
    {
      title: {
        next: {
          a: 1,
          b: 1,
        },
      },
    },
    [
      {
        title: {
          next: {
            a: 1,
          },
        },
      },
      {
        title: {
          next: {
            b: 1,
          },
        },
      },
    ],
  ],
  [
    {
      title: 1,
      other: 1,
    },
    [
      {
        title: 1,
      },
      {
        other: 1,
      },
    ],
  ],
  [
    {
      title: 1,
      nested: {
        a: 1,
        b: 1,
      },
    },
    [
      {
        title: 1,
      },
      {
        nested: {
          a: 1,
        },
      },
      {
        nested: {
          b: 1,
        },
      },
    ],
  ],
  [
    {
      title: 1,
      nested: {
        a: 1,
        deep: {
          c: 1,
          d: 1,
        },
      },
    },
    [
      {
        title: 1,
      },
      {
        nested: {
          a: 1,
        },
      },
      {
        nested: {
          deep: {
            c: 1,
          },
        },
      },
      {
        nested: {
          deep: {
            d: 1,
          },
        },
      },
    ],
  ],
  [
    {
      other: 1,
      items: {
        $pagination: {
          first: 2,
        },
        name: 1,
        quantity: 1,
      },
    },
    [
      {
        other: 1,
      },
      {
        items: {
          $pagination: {
            first: 2,
          },
          name: 1,
        },
      },
      {
        items: {
          $pagination: {
            first: 2,
          },
          quantity: 1,
        },
      },
    ],
  ],
  [
    {
      publicId: 1,
      userNotes: {
        isOwner: 1,
        readOnly: 1,
      },
      collabTexts: {
        title: {
          headText: {
            changeset: 1,
          },
          records: {
            $pagination: {
              last: 2,
            },
            revision: 1,
          },
        },
      },
    },
    [
      {
        publicId: 1,
      },
      {
        userNotes: {
          isOwner: 1,
        },
      },
      {
        userNotes: {
          readOnly: 1,
        },
      },
      {
        collabTexts: {
          title: {
            headText: {
              changeset: 1,
            },
          },
        },
      },
      {
        collabTexts: {
          title: {
            records: {
              $pagination: {
                last: 2,
              },
              revision: 1,
            },
          },
        },
      },
    ],
  ],
  [
    {
      items: { $pagination: { after: undefined, first: 4 }, _id: 1 },
    },
    [
      {
        items: { $pagination: { after: undefined, first: 4 }, _id: 1 },
      },
    ],
  ],
])('%s => %s', (bigQuery, expectedLeaves) => {
  expect(
    splitObject(bigQuery, {
      keepFn: (key) => key.startsWith('$'),
    })
  ).toStrictEqual(expectedLeaves);
});
