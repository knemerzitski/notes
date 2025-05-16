import { faker } from '@faker-js/faker';
import { Context } from '.';

export function redo(ctx: Context) {
  return ctx.createAction({
    name: 'redo',
    generateArgs: () => {
      return [faker.helpers.weightedArrayElement(ctx.clientWeights)] as const;
    },
    invoke(clientName) {
      const client = ctx.getClient(clientName);
      client.redo();
    },
  });
}
