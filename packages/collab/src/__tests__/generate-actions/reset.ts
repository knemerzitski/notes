import { faker } from '@faker-js/faker';

import { Context } from '.';

export function reset(ctx: Context) {
  return ctx.createAction({
    name: 'reset',
    generateArgs: () => {
      return [faker.helpers.weightedArrayElement(ctx.clientWeights)] as const;
    },
    invoke(clientName) {
      const client = ctx.getClient(clientName);

      // Must clear submission or will get invalid state
      const state = ctx.getClientState(clientName);
      state.submission = null;

      client.reset();
    },
  });
}
