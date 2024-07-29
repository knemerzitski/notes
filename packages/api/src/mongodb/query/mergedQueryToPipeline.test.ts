import { describe, expect, it } from 'vitest';

import { DeepAnyDescription } from './description';
import { MergedDeepQuery } from './mergeQueries';
import {
  AddStagesContext,
  buildLastProjectValue,
  buildStages,
} from './mergedQueryToPipeline';

describe('buildLastProjectValue', () => {
  describe('expands strings to object and merges with nesting', () => {
    it.each([
      [{}, {}],
      [5, 5],
      ['text', 'text'],
      [{ a: 1 }, { a: 1 }],
      [
        {
          'a.b': 1,
        },
        {
          a: {
            b: 1,
          },
        },
      ],
      [
        {
          nested: {
            a: 0,
          },
        },
        {
          nested: {
            a: 0,
          },
        },
      ],
      [
        {
          text: 1,
          'a.b': '$other',
          'a.c': '$cc',
          nested: {
            a: 0,
            'd.c': '$ok',
            r: {
              l: 0,
            },
          },
        },
        {
          text: 1,
          a: {
            b: '$other',
            c: '$cc',
          },
          nested: {
            a: 0,
            d: {
              c: '$ok',
            },
            r: {
              l: 0,
            },
          },
        },
      ],
    ])('(%s,%s) => %s', (query, expectedResult) => {
      expect(buildLastProjectValue(query)).toStrictEqual(expectedResult);
    });
  });

  describe('hops over array $query', () => {
    it.each([
      [
        {
          items: {
            $query: {
              innerItems: {
                $query: {
                  name: 1,
                },
              },
            },
          },
        },
        {
          items: {
            innerItems: {
              name: 1,
            },
          },
        },
      ],
    ])('(%s,%s) => %s', (query, expectedResult) => {
      expect(buildLastProjectValue(query as MergedDeepQuery<unknown>)).toStrictEqual(
        expectedResult
      );
    });
  });

  describe('description $mapLastProject', () => {
    it.each([
      [
        2,
        {
          $mapLastProject(q: number) {
            return q + 8;
          },
        },
        10,
      ],
      [
        { a: 2 },
        {
          a: {
            $mapLastProject(q: number) {
              return q * 2;
            },
          },
        },
        { a: 4 },
      ],
      [
        {
          arr: {
            $query: {
              text: 1,
            },
          },
        },
        {
          arr: {
            $mapLastProject(q: { $query: unknown }) {
              return q.$query;
            },
          },
        },
        {
          arr: {
            text: 1,
          },
        },
      ],
    ])('(%s,%s) => %s', (query, description, expectedResult) => {
      expect(
        buildLastProjectValue(query as MergedDeepQuery<unknown>, {
          descriptions: [description as DeepAnyDescription<unknown>],
        })
      ).toStrictEqual(expectedResult);
    });
  });

  describe('description $mapLastProject with $anyKey', () => {
    it.each([
      [
        {
          types: {
            a: { value: 2 },
            b: { value: 3 },
          },
        },
        {
          types: {
            $anyKey: {
              value: {
                $mapLastProject(query: number) {
                  return query * 2;
                },
              },
            },
            b: {
              value: {
                $mapLastProject(_query: number, projectValue: number) {
                  return 'b:' + String(projectValue);
                },
              },
            },
          },
        },
        {
          types: {
            a: { value: 4 },
            b: { value: 'b:6' },
          },
        },
      ],
    ])('(%s,%s) => %s', (query, description, expectedResult) => {
      expect(
        buildLastProjectValue(query as MergedDeepQuery<unknown>, {
          descriptions: [description as DeepAnyDescription<unknown>],
        })
      ).toStrictEqual(expectedResult);
    });
  });

  describe('replace projection with $replace meta key', () => {
    it.each([
      [
        {
          a: {
            keepThis: 1,
          },
        },
        {
          a: {
            $mapLastProject() {
              return {
                $replace: false,
                custom: 'hi',
              };
            },
          },
        },
        {
          a: {
            keepThis: 1,
            custom: 'hi',
          },
        },
      ],
      [
        {
          a: {
            thisRemoved: 1,
          },
        },
        {
          a: {
            $mapLastProject() {
              return {
                $replace: true,
                custom: 'hi',
              };
            },
          },
        },
        {
          a: {
            custom: 'hi',
          },
        },
      ],
    ])('(%s,%s) => %s', (query, description, expectedResult) => {
      expect(
        buildLastProjectValue(query as MergedDeepQuery<unknown>, {
          descriptions: [description as DeepAnyDescription<unknown>],
        })
      ).toStrictEqual(expectedResult);
    });
  });
});

describe('buildStages', () => {
  it('calls $addStages with every field in $anyKey', () => {
    const query = {
      type: {
        a: {
          deep: {
            $query: {
              text: 1,
            },
          },
        },
        b: {
          deep: {
            $query: {
              number: 1,
            },
          },
        },
      },
    };
    const options = {
      description: {
        type: {
          $anyKey: {
            deep: {
              $addStages({ fields }: AddStagesContext) {
                return fields.map((n) => n.rootPath);
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      'type.a.deep',
      'type.b.deep',
    ]);
  });

  it('passes customContext to $addStages', () => {
    const query = {
      item: {
        nested: {
          value: 1,
        },
      },
    };
    const options = {
      description: {
        item: {
          nested: {
            value: {
              $addStages({ customContext }: AddStagesContext) {
                return [customContext];
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
      customContext: 'ctx',
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      'ctx',
    ]);
  });

  it('builds innerStages', () => {
    const query = {
      item: {
        nested: {
          value: 1,
        },
      },
    };
    const options = {
      description: {
        item: {
          $addStages({ subStages: innerStages }: AddStagesContext) {
            return [
              {
                inner: innerStages(),
              },
            ];
          },
          nested: {
            value: {
              $addStages({ customContext }: AddStagesContext) {
                return [customContext];
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
      customContext: 'ctx',
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      {
        inner: ['ctx'],
      },
    ]);
  });

  it('builds innerStages from specific path', () => {
    const query = {
      item: {
        atInner: {
          value: 1,
        },
        atRoot: {
          value: 1,
        },
      },
    };
    const options = {
      description: {
        item: {
          $addStages({ subStages: innerStages }: AddStagesContext) {
            return [
              {
                lookup: innerStages({
                  subPath: 'atInner',
                }),
              },
            ];
          },
          atInner: {
            value: {
              $addStages() {
                return ['innerStage'];
              },
            },
          },
          atRoot: {
            value: {
              $addStages() {
                return ['rootStage'];
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      {
        lookup: ['innerStage'],
      },
      'rootStage',
    ]);
  });

  it('builds innerLastProject value at specific path', () => {
    const query = {
      item: {
        atInner: {
          value: 1,
        },
        atRoot: {
          value: 2,
        },
      },
    };
    const options = {
      description: {
        item: {
          $addStages({
            subStages: innerStages,
            subLastProject: innerLastProject,
          }: AddStagesContext) {
            return [
              {
                lookup: [
                  ...innerStages({
                    subPath: 'atInner',
                  }),
                  {
                    project: innerLastProject({
                      subPath: 'atInner',
                    }),
                  },
                ],
              },
            ];
          },
          atInner: {
            value: {
              $addStages() {
                return ['innerStage'];
              },
            },
          },
          atRoot: {
            value: {
              $addStages() {
                return ['rootStage'];
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      {
        lookup: [
          'innerStage',
          {
            project: {
              value: 1,
            },
          },
        ],
      },
      'rootStage',
    ]);
  });

  it('passes correct relativePath to innerStages', () => {
    const query = {
      item: {
        nested: {
          value: 1,
        },
      },
    };
    const options = {
      description: {
        item: {
          $addStages({ subStages: innerStages }: AddStagesContext) {
            return [
              {
                inner: innerStages(),
              },
            ];
          },
          nested: {
            value: {
              $addStages({ fields }: AddStagesContext) {
                return fields.map((field) => field.relativePath);
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
      customContext: 'ctx',
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      {
        inner: ['nested.value'],
      },
    ]);
  });

  it('calls $addStages within nested array', () => {
    const query = {
      items: {
        $query: {
          innerItems: {
            $query: {
              name: 1,
            },
          },
        },
      },
    };
    const options = {
      description: {
        items: {
          innerItems: {
            name: {
              $addStages({ fields }: AddStagesContext) {
                return fields.map((field) => field.rootPath);
              },
            },
          },
        },
      } as DeepAnyDescription<unknown>,
      customContext: 'ctx',
    };

    expect(buildStages(query as MergedDeepQuery<unknown>, options)).toStrictEqual([
      'items.innerItems.name',
    ]);
  });
});
