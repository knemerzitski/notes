import { faker } from '@faker-js/faker';

import { Selection } from '../../common/selection';

import { Context } from '.';

export function setCaret(ctx: Context) {
  return ctx.createAction({
    name: 'setCaret',
    generateArgs: () => {
      const clientName = faker.helpers.weightedArrayElement(ctx.clientWeights);

      const startRatio = Math.round(faker.number.float() * 100) / 100;
      const endRatio =
        Math.round(
          faker.number.float({
            min: startRatio,
            max: 1,
          }) * 100
        ) / 100;

      return [clientName, startRatio, endRatio] as const;
    },
    invoke(clientName, startRatio, endRatio) {
      const client = ctx.getClient(clientName);

      client.setCaret(
        Selection.create(
          Math.floor(startRatio * client.viewText.length),
          Math.floor(endRatio * client.viewText.length)
        )
      );
    },
  });
}
