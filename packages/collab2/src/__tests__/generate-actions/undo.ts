import { faker } from '@faker-js/faker';
import { Context } from '.';

export function undo(ctx: Context) {
  return ctx.createAction({
    name: 'undo',
    generateArgs: () => {
      return [faker.helpers.weightedArrayElement(ctx.clientWeights)] as const;
    },
    invoke(clientName) {
      const client = ctx.getClient(clientName);
      client.undo();
    },
  });
}
