/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { setCaret } from './set-caret';
import { insertText } from './insert-text';
import { deleteText } from './delete-text';
import { undo } from './undo';
import { submitStep } from './submit-step';
import { redo } from './redo';
import { createCollabSandbox } from '../helpers/collab-sandbox';
import mapObject from 'map-obj';
import { faker } from '@faker-js/faker';
import { Logger } from '../../../../utils/src/logging';

type ClientName = 'A' | 'B';

type ActionName =
  | 'setCaret'
  | 'insertText'
  | 'deleteText'
  | 'undo'
  | 'redo'
  | 'submitStep';

interface Action<T extends any[]> {
  name: ActionName;
  generateArgs?: () => T;
  invoke: (...args: T) => void;
}

export interface WeightValue<T> {
  weight: number;
  value: T;
}

export type WeightedAction<T extends any[]> = WeightValue<Action<T>>;

export interface Config {
  readonly logger?: Logger;
  readonly collabSandboxOptions?: Parameters<typeof createCollabSandbox<ClientName>>[0];
  readonly actionWeights: Record<ActionName, number>;
  readonly clientWeights: Record<ClientName, number>;
}

export interface Context {
  readonly config: Config;

  readonly createAction: <T extends unknown[]>(action: Action<T>) => WeightedAction<T>;
  readonly clientContext: Record<ClientName, ClientContext>;
  readonly clientWeights: WeightValue<ClientName>[];
}

export interface ClientContext {
  client: ReturnType<typeof createCollabSandbox>['client']['string'];
}

export interface GeneratedActions {
  readonly context: Context;
  readonly actions: readonly WeightedAction<any>[];
  run: (actionsCount: number) => void;
}

export function generateActions(config: Config): GeneratedActions {
  const ctx = createContext(config);
  const actions: WeightedAction<any>[] = [
    setCaret(ctx),
    insertText(ctx),
    deleteText(ctx),
    undo(ctx),
    redo(ctx),
    submitStep(ctx),
  ];

  return {
    context: ctx,
    actions,
    run: (actionsCount: number) => {
      for (let i = 0; i < actionsCount; i++) {
        const action = faker.helpers.weightedArrayElement(actions);
        const args: any = action.generateArgs?.() ?? [];
        config.logger?.debug(`${i} ${action.name}`, args);
        try {
          action.invoke(...args);
        } catch (err) {
          console.log('Error on action at index', i);
          throw err;
        }
      }
    },
  };
}

function createContext(config: Config): Context {
  const collabSandbox = createCollabSandbox({
    clients: ['A', 'B'],
    ...config.collabSandboxOptions,
  });

  return {
    createAction: (action) => ({
      weight: config.actionWeights[action.name],
      value: action,
    }),
    clientContext: mapObject(collabSandbox.client, (name, client) => [
      name,
      {
        client,
        submission: null,
      } satisfies ClientContext,
    ]),
    clientWeights: Object.entries(config.clientWeights).map((v) => ({
      value: v[0] as ClientName,
      weight: v[1],
    })),
    submitStepWeights: Object.entries(config.submitStepWeights).map((v) => ({
      value: Number.parseInt(v[0]),
      weight: v[1],
    })),
    config,
  };
}
