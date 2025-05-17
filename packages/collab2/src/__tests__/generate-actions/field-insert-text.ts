import { faker } from '@faker-js/faker';

import { parseInsert } from './insert-text';

import { Context } from '.';

export function fieldInsertText(ctx: Context) {
  return ctx.createAction({
    name: 'fieldInsertText',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        faker.helpers.weightedArrayElement(ctx.fieldWeights),
        parseInsert(faker.helpers.weightedArrayElement(ctx.config.insert)),
        faker.helpers.maybe(() => true, {
          probability: ctx.config.mergeProbability,
        }) ?? false,
      ] as const;
    },
    invoke(clientName, fieldName, value, merge) {
      const client = ctx.getClient(clientName);
      const field = client.getField(fieldName);

      field.insert(value, {
        historyType: merge ? 'merge' : undefined,
      });
    },
  });
}
