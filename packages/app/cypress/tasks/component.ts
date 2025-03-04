import { defineConfig } from 'cypress';

type SetupNodeEventsFn = NonNullable<
  Parameters<typeof defineConfig>[0]['setupNodeEvents']
>;

export const setupNodeEvents: SetupNodeEventsFn = (_on, _config) => {
  //
};
