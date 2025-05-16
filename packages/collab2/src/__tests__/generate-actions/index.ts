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
import { fieldInsertText } from './field-insert-text';
import { isDefined } from '../../../../utils/src/type-guards/is-defined';
import { fieldSetCaret } from './field-set-caret';
import { fieldDeleteText } from './field-delete-text';

type ClientName = 'A' | 'B';

type ActionName =
  | 'setCaret'
  | 'insertText'
  | 'deleteText'
  | 'undo'
  | 'redo'
  | 'submitStep'
  | 'fieldSetCaret'
  | 'fieldInsertText'
  | 'fieldDeleteText';

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
  readonly actionWeights: Partial<Record<ActionName, number>>;
  readonly clientWeights: Record<ClientName, number>;
  readonly fieldWeights?: Record<string, number>;
}

export interface Context {
  readonly config: Config;

  readonly createAction: <T extends unknown[]>(
    action: Action<T>
  ) => WeightedAction<T> | undefined;
  readonly clientContext: Record<ClientName, ClientContext>;
  readonly clientWeights: WeightValue<ClientName>[];
  readonly fieldWeights: WeightValue<string>[];
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
    fieldSetCaret(ctx),
    fieldInsertText(ctx),
    fieldDeleteText(ctx),
  ].filter(isDefined);

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
    createAction: (action) => {
      const weight = config.actionWeights[action.name];
      if (weight === undefined || weight <= 0) {
        return;
      }

      return {
        weight,
        value: action,
      };
    },
    clientContext: mapObject(collabSandbox.client, (name, client) => [
      name,
      {
        client,
        submission: null,
      } satisfies ClientContext,
    ]),
    clientWeights: mapWeights(config.clientWeights),
    submitStepWeights: mapWeights(config.submitStepWeights),
    fieldWeights: config.fieldWeights ? mapWeights(config.fieldWeights) : [],
    config,
  };
}

function mapWeights<T extends string | number>(
  weightsRecord: Record<T, number>
): WeightValue<T>[] {
  return Object.entries<number>(weightsRecord)
    .map(([key, value]) => ({
      value: key as T,
      weight: value,
    }))
    .filter(({ weight }) => weight > 0);
}
