import { faker } from '@faker-js/faker';
import { Context } from '.';

declare module '.' {
  export interface Config {
    readonly insertLength:
      | number
      | {
          readonly min: number;
          readonly max: number;
        };
    readonly mergeProbability: number;
  }
}

export function insertText(ctx: Context) {
  return ctx.createAction({
    name: 'insertText',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        faker.word.sample({
          length: ctx.config.insertLength,
          strategy: 'closest',
        }),
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
