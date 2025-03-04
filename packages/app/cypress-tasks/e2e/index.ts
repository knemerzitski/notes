import { defineConfig } from 'cypress';

import { resetDatabase } from './mongodb';

type SetupNodeEventsFn = NonNullable<
  Parameters<typeof defineConfig>[0]['setupNodeEvents']
>;

// type PluginEvents = Parameters<SetupNodeEventsFn>[0];

// type Tasks = Parameters<PluginEvents>[1];

export const setupNodeEvents: SetupNodeEventsFn = (on, _config) => {
  on('task', {
    resetDatabase,
  });
};

export interface Tasks {
  resetDatabase: typeof resetDatabase;
}
