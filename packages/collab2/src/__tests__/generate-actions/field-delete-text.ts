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

export function fieldDeleteText(ctx: Context) {
  return ctx.createAction({
    name: 'fieldDeleteText',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        faker.helpers.weightedArrayElement(ctx.fieldWeights),
        faker.number.int(ctx.config.deleteCount),
        faker.helpers.maybe(() => true, {
          probability: ctx.config.mergeProbability,
        }) ?? false,
      ] as const;
    },
    invoke(clientName, fieldName, deleteCount, merge) {
      const client = ctx.getClient(clientName);
      const field = client.getField(fieldName);

      field.delete(deleteCount, {
        historyType: merge ? 'merge' : undefined,
      });
    },
  });
}
