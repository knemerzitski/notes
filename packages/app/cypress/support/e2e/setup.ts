import { SetupNodeEventsFn } from '../types';

import { MongoDBTasks } from './mongodb/setup';
import { WebSocketTasks } from './websocket/setup';

const TASKS_LIST = [MongoDBTasks, WebSocketTasks];

export const setupNodeEvents: SetupNodeEventsFn = async (on, config) => {
  await Promise.all([
    TASKS_LIST.map(async (TasksClass) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const asyncConstructor = (await TasksClass.asyncConstructor(config)) as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const tasksInstance = new TasksClass(asyncConstructor);
      await tasksInstance.setupNodeEvents(on, config);
    }),
  ]);
};
