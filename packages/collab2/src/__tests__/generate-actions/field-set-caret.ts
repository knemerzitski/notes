import { faker } from '@faker-js/faker';
import { Context } from '.';
import { Selection } from '../../common/selection';

export function fieldSetCaret(ctx: Context) {
  return ctx.createAction({
    name: 'fieldSetCaret',
    generateArgs: () => {
      const clientName = faker.helpers.weightedArrayElement(ctx.clientWeights);
      const fieldName = faker.helpers.weightedArrayElement(ctx.fieldWeights);

      const startRatio = Math.round(faker.number.float() * 100) / 100;
      const endRatio =
        Math.round(
          faker.number.float({
            min: startRatio,
            max: 1,
          }) * 100
        ) / 100;

      return [clientName, fieldName, startRatio, endRatio] as const;
    },
    invoke(clientName, fieldName, startRatio, endRatio) {
      const client = ctx.clientContext[clientName].client;
      const field = client.getField(fieldName);

      field.setCaret(
        Selection.create(
          Math.floor(startRatio * field.value.length),
          Math.floor(endRatio * field.value.length)
        )
      );
    },
  });
}
