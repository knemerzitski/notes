import { faker } from '@faker-js/faker';

import { Context } from '.';

declare module '.' {
  export interface Config {
    readonly deleteCount:
      | number
      | {
          readonly min: number;
          readonly max: number;
        };
    readonly mergeProbability: number;
  }
}

export function deleteText(ctx: Context) {
  return ctx.createAction({
    name: 'deleteText',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        faker.number.int(ctx.config.deleteCount),
        faker.helpers.maybe(() => true, {
          probability: ctx.config.mergeProbability,
        }) ?? false,
      ] as const;
    },
    invoke(clientName, deleteCount, merge) {
      const client = ctx.getClient(clientName);
      client.delete(deleteCount, {
        historyType: merge ? 'merge' : undefined,
      });
    },
  });
}
