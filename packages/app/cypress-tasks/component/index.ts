import { defineConfig } from 'cypress';

type SetupNodeEventsFn = NonNullable<
  Parameters<typeof defineConfig>[0]['setupNodeEvents']
>;

export const setupNodeEvents: SetupNodeEventsFn = (_on, _config) => {
  //
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Tasks {
  //
}
