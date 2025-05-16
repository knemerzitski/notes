import { faker } from '@faker-js/faker';
import { Config, Context } from '.';

declare module '.' {
  export interface Config {
    readonly insert: WeightValue<
      | {
          type: 'word';
          value:
            | number
            | {
                readonly min: number;
                readonly max: number;
              };
        }
      | {
          type: 'custom';
          value: string;
        }
    >[];
    readonly mergeProbability: number;
  }
}

export function parseInsert(value: Config['insert'][number]['value']) {
  if (value.type === 'word') {
    return faker.word.sample({
      length: value.value,
      strategy: 'closest',
    });
  } else {
    return value.value;
  }
}

export function insertText(ctx: Context) {
  return ctx.createAction({
    name: 'insertText',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        parseInsert(faker.helpers.weightedArrayElement(ctx.config.insert)),
        faker.helpers.maybe(() => true, {
          probability: ctx.config.mergeProbability,
        }) ?? false,
      ] as const;
    },
    invoke(clientName, value, merge) {
      const client = ctx.clientContext[clientName].client;

      client.insert(value, {
        historyType: merge ? 'merge' : undefined,
      });
    },
  });
}
