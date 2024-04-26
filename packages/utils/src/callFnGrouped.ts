import { MaybePromise } from './types';

/**
 * Calls functions with grouped inputs.
 *
 * Calls {@link groupHandler} once for each grouping according to {@link inputToGroup}
 * and returns output in same order and size as {@link inputs}.
 */
export default async function callFnGrouped<TIn, TOut, TGroup>(
  inputs: Readonly<TIn[]>,
  inputToGroup: (input: TIn) => TGroup,
  groupHandler: (groupedInputs: TIn[], group: TGroup) => MaybePromise<TOut[]>
): Promise<TOut[]> {
  const inputsGrouped = inputs.reduce((map, key) => {
    const group = inputToGroup(key);
    const existing = map.get(group);
    if (existing) {
      existing.push(key);
    } else {
      map.set(group, [key]);
    }
    return map;
  }, new Map<TGroup, TIn[]>());

  const inputToOutput = new Map<TIn, TOut>();
  await Promise.all(
    [...inputsGrouped.entries()].map(async ([group, inputs]) => {
      const outputs = await groupHandler(inputs, group);
      if (outputs.length !== inputs.length) {
        throw new Error(
          `Expected result outputs length match inputs array length. inputs: ${inputs.length}, outputs: ${outputs.length}`
        );
      }
      for (let i = 0; i < inputs.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const key = inputs[i]!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result = outputs[i]!;
        inputToOutput.set(key, result);
      }
    })
  );

  return inputs.map((key) => inputToOutput.get(key) as TOut);
}
